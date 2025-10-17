#!/usr/bin/env python3
"""
Real Estate PDF Analyzer using MinerU
Converts PDFs to markdown and extracts real estate data
"""

import os
import tempfile
import json
import asyncio
from pathlib import Path
from fastapi import FastAPI, UploadFile, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn
from database import db

# MinerU imports
try:
    from mineru.cli.fast_api import parse_pdf
    MINERU_AVAILABLE = True
except ImportError:
    MINERU_AVAILABLE = False

# Fallback PDF processing
import PyPDF2

app = FastAPI(title="Real Estate PDF Analyzer", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:9000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisResult(BaseModel):
    success: bool
    filename: str
    markdown_content: str
    extracted_data: Dict[str, Any]
    error: Optional[str] = None
    analysis_id: Optional[int] = None

class UserRegistration(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str

class AnalysisHistory(BaseModel):
    id: int
    filename: str
    original_filename: str
    extracted_data: Dict[str, Any]
    analysis_date: str
    file_size: int

def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Get current user from session token"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    session_token = authorization.split(" ")[1]
    return db.get_user_by_session(session_token)

@app.post("/register")
async def register_user(user_data: UserRegistration) -> Dict[str, Any]:
    """Register a new user"""
    user_id = db.create_user(user_data.username, user_data.email, user_data.password)
    
    if user_id is None:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    session_token = db.create_session(user_id)
    
    return {
        "success": True,
        "message": "User registered successfully",
        "session_token": session_token,
        "user": {
            "id": user_id,
            "username": user_data.username,
            "email": user_data.email
        }
    }

@app.post("/login")
async def login_user(login_data: UserLogin) -> Dict[str, Any]:
    """Login a user"""
    user = db.authenticate_user(login_data.username, login_data.password)
    
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    session_token = db.create_session(user["id"])
    
    return {
        "success": True,
        "message": "Login successful",
        "session_token": session_token,
        "user": user
    }

@app.get("/me")
async def get_current_user_info(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    """Get current user information"""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "success": True,
        "user": current_user
    }

@app.get("/analyses")
async def get_user_analyses(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    """Get user's PDF analysis history"""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    analyses = db.get_user_analyses(current_user["id"])
    
    return {
        "success": True,
        "analyses": analyses
    }

@app.get("/analyses/{analysis_id}")
async def get_analysis(analysis_id: int, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    """Get a specific analysis by ID"""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    analysis = db.get_analysis_by_id(analysis_id, current_user["id"])
    
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "success": True,
        "analysis": analysis
    }

@app.delete("/analyses/{analysis_id}")
async def delete_analysis(analysis_id: int, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    """Delete a specific analysis"""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    deleted = db.delete_analysis(analysis_id, current_user["id"])
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "success": True,
        "message": "Analysis deleted successfully"
    }

@app.post("/analyze-pdf")
async def analyze_pdf(file: UploadFile, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> AnalysisResult:
    """
    Analyze a real estate PDF using MinerU
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Create temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Save uploaded PDF
            pdf_path = os.path.join(temp_dir, "input.pdf")
            with open(pdf_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="PDF is empty")
            
            # Try MinerU first, fallback to PyPDF2
            markdown_content = ""
            
            if MINERU_AVAILABLE:
                try:
                    # Create a temporary UploadFile object for MinerU
                    from fastapi import UploadFile as FastAPIUploadFile
                    from io import BytesIO
                    
                    # Reset file pointer
                    file.file.seek(0)
                    file_content = await file.read()
                    file.file.seek(0)
                    
                    # Create UploadFile object for MinerU
                    pdf_file = FastAPIUploadFile(
                        filename=file.filename,
                        file=BytesIO(file_content),
                        content_type="application/pdf"
                    )
                    
                    # Call MinerU with proper parameters
                    result = await parse_pdf(
                        files=[pdf_file],
                        output_dir="./output",
                        lang_list=["en"],
                        backend="pipeline",
                        parse_method="auto",
                        formula_enable=True,
                        table_enable=True,
                        return_md=True
                    )
                    
                    # Extract markdown content from result
                    if hasattr(result, 'markdown') and result.markdown:
                        markdown_content = result.markdown
                    elif hasattr(result, 'text') and result.text:
                        markdown_content = result.text
                    elif isinstance(result, dict) and 'markdown' in result:
                        markdown_content = result['markdown']
                    elif isinstance(result, dict) and 'text' in result:
                        markdown_content = result['text']
                    else:
                        markdown_content = str(result)
                        
                except Exception as e:
                    print(f"MinerU failed: {e}, falling back to PyPDF2")
                    markdown_content = ""
            
            # Fallback to PyPDF2 if MinerU failed or not available
            if not markdown_content:
                try:
                    reader = PyPDF2.PdfReader(pdf_path)
                    markdown_content = ""
                    for page in reader.pages:
                        markdown_content += page.extract_text() + "\n"
                except Exception as e:
                    print(f"PyPDF2 also failed: {e}")
                    markdown_content = "Error extracting text from PDF"
            
            # Extract real estate data from markdown
            extracted_data = extract_real_estate_data(markdown_content)
            
            # Save to user's account if authenticated
            analysis_id = None
            if current_user:
                analysis_id = db.save_pdf_analysis(
                    user_id=current_user["id"],
                    filename=file.filename,
                    original_filename=file.filename,
                    extracted_data=extracted_data,
                    markdown_content=markdown_content,
                    file_size=len(content)
                )
            
            return AnalysisResult(
                success=True,
                filename=file.filename,
                markdown_content=markdown_content,
                extracted_data=extracted_data,
                error=None,
                analysis_id=analysis_id
            )
            
        except Exception as e:
            return AnalysisResult(
                success=False,
                filename=file.filename,
                markdown_content="",
                extracted_data={},
                error=str(e)
            )

def extract_real_estate_data(markdown_content: str) -> Dict[str, Any]:
    """
    Extract real estate data from markdown content in the specific format requested
    Handles both residential and commercial properties
    """
    import re
    
    data = {}
    
    # Determine if this is commercial/industrial or residential
    is_commercial = any(keyword in markdown_content.lower() for keyword in [
        'industrial', 'commercial', 'office', 'warehouse', 'retail', 'lease', 'sf', 'square feet'
    ])
    
    # Extract price patterns - more comprehensive
    price_patterns = [
        r'\$[\d,]+(?:\.\d{2})?',
        r'Price:\s*\$?[\d,]+(?:\.\d{2})?',
        r'Asking:\s*\$?[\d,]+(?:\.\d{2})?',
        r'Listed\s*at:\s*\$?[\d,]+(?:\.\d{2})?',
        r'Value:\s*\$?[\d,]+(?:\.\d{2})?',
        r'Cost:\s*\$?[\d,]+(?:\.\d{2})?',
        r'Rent[:\s]*\$?[\d,]+(?:\.\d{2})?',
        r'Rate[:\s]*\$?[\d,]+(?:\.\d{2})?'
    ]
    for pattern in price_patterns:
        matches = re.findall(pattern, markdown_content, re.IGNORECASE)
        if matches:
            # Clean up the price format
            price = matches[0]
            # If it doesn't start with $, add it
            if not price.startswith('$'):
                price = f"${price}"
            data['Price'] = price
            break
    
    # Extract square footage - more comprehensive
    sqft_patterns = [
        r'(\d{1,3}(?:,\d{3})*)\s*(?:sq\.?\s*ft\.?|square\s*feet)',
        r'(\d{1,3}(?:,\d{3})*)\s*SF',
        r'(\d{1,3}(?:,\d{3})*)\s*sqft',
        r'(\d{1,3}(?:,\d{3})*)\s*sq\.?\s*ft',
        r'Size:\s*(\d{1,3}(?:,\d{3})*)\s*(?:sq\.?\s*ft\.?|square\s*feet|SF)',
        r'Area:\s*(\d{1,3}(?:,\d{3})*)\s*(?:sq\.?\s*ft\.?|square\s*feet|SF)',
        r'Total\s*building\s*area:\s*(\d{1,3}(?:,\d{3})*)',
        r'Building\s*area:\s*(\d{1,3}(?:,\d{3})*)',
        r'(\d{1,3}(?:,\d{3})*)\s*SF\s*Industrial',
        r'(\d{1,3}(?:,\d{3})*)\s*SF\s*Space'
    ]
    for pattern in sqft_patterns:
        matches = re.findall(pattern, markdown_content, re.IGNORECASE)
        if matches:
            data['Sq Ft'] = matches[0].replace(',', '')
            break
    
    # Extract bedrooms - only for residential
    if not is_commercial:
        bed_patterns = [
            r'(\d+)\s*(?:bed|bedroom|br|beds)',
            r'Bedrooms?:\s*(\d+)',
            r'(\d+)\s*bedroom',
            r'(\d+)\s*br'
        ]
        for pattern in bed_patterns:
            matches = re.findall(pattern, markdown_content, re.IGNORECASE)
            if matches:
                data['Bedrooms'] = matches[0]
                break
    
    # Extract bathrooms - only for residential
    if not is_commercial:
        bath_patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba|baths)',
            r'Bathrooms?:\s*(\d+(?:\.\d+)?)',
            r'(\d+(?:\.\d+)?)\s*bathroom',
            r'(\d+(?:\.\d+)?)\s*ba'
        ]
        for pattern in bath_patterns:
            matches = re.findall(pattern, markdown_content, re.IGNORECASE)
            if matches:
                data['Bathrooms'] = matches[0]
                break
    
    # Extract MLS number - more comprehensive
    mls_patterns = [
        r'MLS[#\s]*(\d+)',
        r'MLS\s*ID[:\s]*(\d+)',
        r'Listing\s*ID[:\s]*(\d+)',
        r'MLS\s*Number[:\s]*(\d+)',
        r'MLS#\s*(\d+)',
        r'Listing\s*Number[:\s]*(\d+)'
    ]
    for pattern in mls_patterns:
        matches = re.findall(pattern, markdown_content, re.IGNORECASE)
        if matches:
            data['MLS#'] = matches[0]
            break
    
    # Extract address - more comprehensive
    address_patterns = [
        r'(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Cir|Court|Ct|Place|Pl|Blvd|Pkwy|Parkway))',
        r'Address[:\s]*([^\n]+)',
        r'Property[:\s]*([^\n]+)',
        r'Location[:\s]*([^\n]+)',
        r'(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Cir|Court|Ct|Place|Pl|Blvd|Pkwy|Parkway)[^,\n]*(?:,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})?)',
        # For commercial properties, look for address patterns in the content
        r'(\d+\d+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Cir|Court|Ct|Place|Pl|Blvd|Pkwy|Parkway)[^,\n]*(?:,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})?)'
    ]
    for pattern in address_patterns:
        matches = re.findall(pattern, markdown_content, re.IGNORECASE)
        if matches:
            address = matches[0].strip()
            # Clean up the address
            address = re.sub(r'\s+', ' ', address)  # Remove extra spaces
            data['Address'] = address
            break
    
    # Extract lot size / land area
    lot_patterns = [
        r'Lot\s*Size[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:sq\.?\s*ft\.?|square\s*feet|SF)',
        r'Lot\s*Size[:\s]*(\d+(?:\.\d+)?)\s*(?:acres?|ac\.?)(?!\w)',
        r'Land\s*Area[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:sq\.?\s*ft\.?|SF)',
        r'Lot[:\s]*(\d+(?:\.\d+)?)\s*ac(?:re)?s?'
    ]
    for pattern in lot_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            value = m.group(1)
            # Normalize acres to append unit if detected
            if 'ac' in m.group(0).lower():
                data['Lot Size'] = f"{value} acres"
            else:
                data['Lot Size'] = f"{value} sqft"
            break

    # Property taxes / HOA
    taxes_patterns = [
        r'Taxes?[:\s]*\$?([\d,]+(?:\.\d{2})?)',
        r'Property\s*Tax(?:es)?[:\s]*\$?([\d,]+(?:\.\d{2})?)'
    ]
    for pattern in taxes_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            data['Taxes'] = f"${m.group(1)}"
            break

    hoa_patterns = [
        r'HOA\s*(?:Fees?|Dues?)[:\s]*\$?([\d,]+(?:\.\d{2})?)\s*(?:/\s*(month|mo|year|yr|quarter|qtr))?',
        r'Association\s*Fee[:\s]*\$?([\d,]+(?:\.\d{2})?)\s*(?:/\s*(month|mo|year|yr|quarter|qtr))?'
    ]
    for pattern in hoa_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            amount = f"${m.group(1)}"
            freq = m.group(2)
            data['HOA'] = amount if not freq else f"{amount} / {freq}"
            break

    # Zoning (commercial)
    zoning_patterns = [
        r'Zoning[:\s]*([A-Za-z0-9\-]+)',
        r'Zone[:\s]*([A-Za-z0-9\-]+)'
    ]
    for pattern in zoning_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            data['Zoning'] = m.group(1)
            break

    # Income / investment metrics
    cap_rate_patterns = [
        r'Cap\s*Rate[:\s]*([\d\.]+)\s*%',
        r'Capitalization\s*Rate[:\s]*([\d\.]+)\s*%'
    ]
    for pattern in cap_rate_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            data['Cap Rate'] = f"{m.group(1)}%"
            break

    noi_patterns = [
        r'NOI[:\s]*\$?([\d,]+(?:\.\d{2})?)',
        r'Net\s*Operating\s*Income[:\s]*\$?([\d,]+(?:\.\d{2})?)'
    ]
    for pattern in noi_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            data['NOI'] = f"${m.group(1)}"
            break

    # Building specifics
    units_patterns = [
        r'Units?[:\s]*([\d,]+)',
        r'([\d,]+)\s*units?\b'
    ]
    for pattern in units_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            data['Units'] = m.group(1).replace(',', '')
            break

    floors_patterns = [
        r'Floors?[:\s]*([\d]+)',
        r'Stories?[:\s]*([\d]+)'
    ]
    for pattern in floors_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            data['Floors'] = m.group(1)
            break

    parking_patterns = [
        r'Parking[:\s]*([A-Za-z0-9\s\-\+]+)',
        r'([\d]+)\s*parking\s*(?:spaces|spots)'
    ]
    for pattern in parking_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            data['Parking'] = m.group(1).strip()
            break

    ceiling_patterns = [
        r'Ceiling\s*Height[:\s]*([\d\.]+)\s*(?:ft|feet)'
    ]
    for pattern in ceiling_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            data['Ceiling Height'] = f"{m.group(1)} ft"
            break

    loading_patterns = [
        r'Loading\s*Docks?[:\s]*([\d]+)'
    ]
    for pattern in loading_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            data['Loading Docks'] = m.group(1)
            break

    # Renovation / features (residential)
    reno_patterns = [
        r'Renovated[:\s]*(\d{4})',
        r'Updated[:\s]*(\d{4})'
    ]
    for pattern in reno_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            data['Renovated'] = m.group(1)
            break

    feature_flags = {
        'Garage': [r'\bgarage\b'],
        'Pool': [r'\bpool\b'],
        'Basement': [r'\bbasement\b']
    }
    for key, patterns in feature_flags.items():
        for pattern in patterns:
            if re.search(pattern, markdown_content, re.IGNORECASE):
                data[key] = 'Yes'
                break

    # Contact details
    email_match = re.search(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', markdown_content)
    if email_match:
        data['Contact Email'] = email_match.group(0)

    phone_match = re.search(r'(?:\+?1[\s\-\.]*)?\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}', markdown_content)
    if phone_match:
        data['Contact Phone'] = phone_match.group(0)

    agent_patterns = [
        r'Agent[:\s]*([A-Za-z\s\.-]+)',
        r'Broker[:\s]*([A-Za-z\s\.-]+)'
    ]
    for pattern in agent_patterns:
        m = re.search(pattern, markdown_content, re.IGNORECASE)
        if m:
            data['Agent'] = m.group(1).strip()
            break

    # Extract year built
    year_patterns = [
        r'Built[:\s]*(\d{4})',
        r'Year\s*Built[:\s]*(\d{4})',
        r'Constructed[:\s]*(\d{4})',
        r'(\d{4})\s*built',
        r'Built\s*in[:\s]*(\d{4})'
    ]
    for pattern in year_patterns:
        matches = re.findall(pattern, markdown_content, re.IGNORECASE)
        if matches:
            data['Built'] = matches[0]
            break
    
    # For commercial properties, add property type if we can determine it
    if is_commercial:
        if 'industrial' in markdown_content.lower():
            data['Property Type'] = 'Industrial'
        elif 'office' in markdown_content.lower():
            data['Property Type'] = 'Office'
        elif 'retail' in markdown_content.lower():
            data['Property Type'] = 'Retail'
        elif 'warehouse' in markdown_content.lower():
            data['Property Type'] = 'Warehouse'
        else:
            data['Property Type'] = 'Commercial'
    
    return data

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "pdf-analyzer"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
