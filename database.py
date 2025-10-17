#!/usr/bin/env python3
"""
Database models and setup for Real Estate PDF Analyzer
"""

import os
import sqlite3
from datetime import datetime
from typing import Optional, List, Dict, Any
import hashlib
import secrets

class Database:
    def __init__(self, db_path: str = "real_estate_analyzer.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # PDF Analysis Results table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pdf_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                extracted_data TEXT NOT NULL,  -- JSON string
                markdown_content TEXT,
                file_size INTEGER,
                analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # User Sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def hash_password(self, password: str) -> str:
        """Hash a password using SHA-256 with salt"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{password_hash}"
    
    def verify_password(self, password: str, stored_hash: str) -> bool:
        """Verify a password against its stored hash"""
        try:
            salt, password_hash = stored_hash.split(':')
            return hashlib.sha256((password + salt).encode()).hexdigest() == password_hash
        except:
            return False
    
    def create_user(self, username: str, email: str, password: str) -> Optional[int]:
        """Create a new user and return user ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            password_hash = self.hash_password(password)
            cursor.execute('''
                INSERT INTO users (username, email, password_hash)
                VALUES (?, ?, ?)
            ''', (username, email, password_hash))
            
            user_id = cursor.lastrowid
            conn.commit()
            return user_id
        except sqlite3.IntegrityError:
            return None  # Username or email already exists
        finally:
            conn.close()
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate a user and return user data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, password_hash
            FROM users
            WHERE username = ? OR email = ?
        ''', (username, username))
        
        user = cursor.fetchone()
        conn.close()
        
        if user and self.verify_password(password, user[3]):
            return {
                'id': user[0],
                'username': user[1],
                'email': user[2]
            }
        return None
    
    def create_session(self, user_id: int) -> str:
        """Create a new session for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now().timestamp() + (7 * 24 * 60 * 60)  # 7 days
        
        cursor.execute('''
            INSERT INTO user_sessions (user_id, session_token, expires_at)
            VALUES (?, ?, ?)
        ''', (user_id, session_token, expires_at))
        
        conn.commit()
        conn.close()
        return session_token
    
    def get_user_by_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Get user data by session token"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT u.id, u.username, u.email
            FROM users u
            JOIN user_sessions s ON u.id = s.user_id
            WHERE s.session_token = ? AND s.expires_at > ?
        ''', (session_token, datetime.now().timestamp()))
        
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return {
                'id': user[0],
                'username': user[1],
                'email': user[2]
            }
        return None
    
    def save_pdf_analysis(self, user_id: int, filename: str, original_filename: str, 
                         extracted_data: Dict[str, Any], markdown_content: str, 
                         file_size: int) -> int:
        """Save PDF analysis results for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        import json
        extracted_data_json = json.dumps(extracted_data)
        
        cursor.execute('''
            INSERT INTO pdf_analyses (user_id, filename, original_filename, extracted_data, 
                                    markdown_content, file_size)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, filename, original_filename, extracted_data_json, 
              markdown_content, file_size))
        
        analysis_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return analysis_id
    
    def get_user_analyses(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all PDF analyses for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, filename, original_filename, extracted_data, markdown_content,
                   file_size, analysis_date
            FROM pdf_analyses
            WHERE user_id = ?
            ORDER BY analysis_date DESC
            LIMIT ?
        ''', (user_id, limit))
        
        analyses = []
        for row in cursor.fetchall():
            import json
            analyses.append({
                'id': row[0],
                'filename': row[1],
                'original_filename': row[2],
                'extracted_data': json.loads(row[3]),
                'markdown_content': row[4],
                'file_size': row[5],
                'analysis_date': row[6]
            })
        
        conn.close()
        return analyses
    
    def get_analysis_by_id(self, analysis_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific analysis by ID for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, filename, original_filename, extracted_data, markdown_content,
                   file_size, analysis_date
            FROM pdf_analyses
            WHERE id = ? AND user_id = ?
        ''', (analysis_id, user_id))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            import json
            return {
                'id': row[0],
                'filename': row[1],
                'original_filename': row[2],
                'extracted_data': json.loads(row[3]),
                'markdown_content': row[4],
                'file_size': row[5],
                'analysis_date': row[6]
            }
        return None
    
    def delete_analysis(self, analysis_id: int, user_id: int) -> bool:
        """Delete an analysis for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            DELETE FROM pdf_analyses
            WHERE id = ? AND user_id = ?
        ''', (analysis_id, user_id))
        
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted
    
    def cleanup_expired_sessions(self):
        """Remove expired sessions"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            DELETE FROM user_sessions
            WHERE expires_at <= ?
        ''', (datetime.now().timestamp(),))
        
        conn.commit()
        conn.close()

# Global database instance
db = Database()
