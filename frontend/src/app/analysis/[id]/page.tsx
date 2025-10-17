'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Analysis {
  id: number;
  filename: string;
  original_filename: string;
  extracted_data: Record<string, any>;
  markdown_content: string;
  analysis_date: string;
  file_size: number;
}

export default function AnalysisDetailPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const sessionToken = localStorage.getItem('session_token');
    
    if (!sessionToken) {
      router.push('/login');
      return;
    }

    fetchAnalysis();
  }, [router, params.id]);

  const fetchAnalysis = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`http://localhost:8000/analyses/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
      } else if (response.status === 401) {
        router.push('/login');
      } else if (response.status === 404) {
        setError('Analysis not found');
      }
    } catch (err) {
      setError('Failed to fetch analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async () => {
    if (!confirm('Are you sure you want to delete this analysis? This action cannot be undone.')) {
      return;
    }

    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`http://localhost:8000/analyses/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        router.push('/dashboard');
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to delete analysis');
      }
    } catch (err) {
      setError('Failed to delete analysis');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Analysis Not Found</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-bg min-h-screen text-white">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
        }
        
        .gradient-bg {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>

      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">RE</span>
            </div>
            <span className="text-xl font-bold">Real Estate Analyzer</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-300 hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={() => router.push('/test.html')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Upload New PDF
            </button>
            <button
              onClick={handleDeleteAnalysis}
              className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-medium hover:bg-red-500/30 hover:text-red-300 transition-colors border border-red-500/30"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Delete Analysis
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{analysis.original_filename}</h1>
          <p className="text-gray-300">
            Analyzed on {formatDate(analysis.analysis_date)} • {formatFileSize(analysis.file_size)}
          </p>
        </div>

        {/* Extracted Data Section */}
        {Object.keys(analysis.extracted_data).length > 0 && (() => {
          // Check if this is a commercial property
          const isCommercial = analysis.extracted_data['Property Type'] || 
                             analysis.extracted_data['Sq Ft'] && !analysis.extracted_data['Bedrooms'];
          
          let displayOrder, propertyDetails;
          
          if (isCommercial) {
            // For commercial properties
            displayOrder = ['Price', 'Sq Ft', 'Property Type'];
            propertyDetails = ['Address', 'MLS#', 'Built'];
          } else {
            // For residential properties
            displayOrder = ['Price', 'Sq Ft', 'Bedrooms', 'Bathrooms'];
            propertyDetails = ['Address', 'MLS#', 'Built'];
          }
          
          // Compute additional fields not covered above
          const primaryKeys = new Set([...(displayOrder || []), ...(propertyDetails || [])]);
          const additionalEntries = Object.entries(analysis.extracted_data)
            .filter(([key]) => !primaryKeys.has(key));

          return (
            <div className="glass-effect rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-6 text-center">Extracted Data</h2>
              
              {/* Main property data */}
              <div className="glass-effect p-6 rounded-xl border border-white/10 mb-6">
                {displayOrder.map((key) => {
                  if (analysis.extracted_data[key]) {
                    return (
                      <div key={key} className="mb-3">
                        <div className="text-sm text-gray-400 mb-1">{key}:</div>
                        <div className="text-lg font-semibold text-white">{analysis.extracted_data[key]}</div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
              
              {/* Property Details section */}
              {propertyDetails.some(key => analysis.extracted_data[key]) && (
                <div className="glass-effect p-6 rounded-xl border border-white/10">
                  <h4 className="text-lg font-semibold mb-4 text-center">Property Details</h4>
                  <div className="space-y-2">
                    {propertyDetails.map((key) => {
                      if (analysis.extracted_data[key]) {
                        return (
                          <div key={key} className="text-white">{analysis.extracted_data[key]}</div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* Additional Fields section */}
              {additionalEntries.length > 0 && (
                <div className="glass-effect p-6 rounded-xl border border-white/10 mt-6">
                  <h4 className="text-lg font-semibold mb-4 text-center">Additional Fields</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {additionalEntries.map(([key, value]) => (
                      <div key={key} className="glass-effect rounded-lg p-4 border border-white/10">
                        <div className="text-sm text-gray-400 mb-1">{key}</div>
                        <div className="text-base font-semibold text-white break-words">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Markdown Content Section */}
        {analysis.markdown_content && (
          <div className="glass-effect rounded-2xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">Extracted Text Content</h2>
            <div className="glass-effect p-6 rounded-xl border border-white/10 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
                {analysis.markdown_content}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
