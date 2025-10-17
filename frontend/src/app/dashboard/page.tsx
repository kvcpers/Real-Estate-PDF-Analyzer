'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Analysis {
  id: number;
  filename: string;
  original_filename: string;
  extracted_data: Record<string, any>;
  analysis_date: string;
  file_size: number;
}

interface User {
  id: number;
  username: string;
  email: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const sessionToken = localStorage.getItem('session_token');
    const userData = localStorage.getItem('user');
    
    if (!sessionToken || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchAnalyses();
  }, [router]);

  const fetchAnalyses = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch('http://localhost:8000/analyses', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyses(data.analyses);
      } else if (response.status === 401) {
        // Session expired
        localStorage.removeItem('session_token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (err) {
      setError('Failed to fetch analyses');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleDeleteAnalysis = async (analysisId: number) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`http://localhost:8000/analyses/${analysisId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        // Remove the analysis from the local state
        setAnalyses(analyses.filter(analysis => analysis.id !== analysisId));
        setDeleteConfirm(null);
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
      month: 'short',
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

  return (
    <div className="gradient-bg min-h-screen text-white">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .gradient-bg {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          min-height: 100vh;
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.04);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .hero-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
        }
        
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .card-hover::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.5s;
        }
        
        .card-hover:hover::before {
          left: 100%;
        }
        
        .card-hover:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(102, 126, 234, 0.1);
          border-color: rgba(102, 126, 234, 0.2);
        }
        
        .fade-in {
          animation: fadeIn 0.6s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .slide-in {
          animation: slideIn 0.8s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .stat-number {
          color: #1e293b;
          font-weight: 700;
          font-size: 1.875rem;
        }
        
        .data-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
          border: 1px solid rgba(102, 126, 234, 0.15);
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        
        .data-card:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
          border-color: rgba(102, 126, 234, 0.25);
          transform: translateY(-1px);
        }
        
        .notion-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .notion-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .notion-card:hover::before {
          opacity: 1;
        }
        
        .notion-card:hover {
          border-color: #667eea;
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.15), 0 4px 6px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }
        
        .apple-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .apple-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }
        
        .apple-button:hover::before {
          left: 100%;
        }
        
        .apple-button:hover {
          background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        
        .apple-button:active {
          transform: translateY(0);
        }
        
        .apple-button-secondary {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .apple-button-secondary:hover {
          background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
          border-color: #94a3b8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .text-primary {
          color: #0f172a;
          font-weight: 600;
        }
        
        .text-secondary {
          color: #64748b;
        }
        
        .text-tertiary {
          color: #94a3b8;
        }
        
        .floating-animation {
          animation: floating 3s ease-in-out infinite;
        }
        
        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .pulse-glow {
          animation: pulseGlow 2s infinite;
        }
        
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(102, 126, 234, 0.6);
          }
        }
        
        .shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Header */}
      <header className="px-6 py-6 slide-in border-b border-gray-200/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">RE</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-primary">Real Estate Analyzer</span>
              <p className="text-sm text-secondary font-medium">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-secondary text-sm font-medium">Welcome back,</p>
              <p className="text-primary font-semibold text-lg">{user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-secondary hover:text-primary transition-all duration-200 p-3 rounded-xl hover:bg-gray-100/50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-12 fade-in">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 text-primary">
              Welcome back, <span className="hero-gradient">{user?.username}</span>
            </h1>
            <p className="text-xl text-secondary max-w-2xl mx-auto leading-relaxed">
              Manage and view all your PDF analyses in one beautiful, organized place
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 fade-in">
          <div className="notion-card p-6 card-hover group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
            </div>
            <div>
              <p className="text-secondary text-sm font-semibold mb-2 uppercase tracking-wide">Total Analyses</p>
              <p className="text-4xl font-bold stat-number mb-1">{analyses.length}</p>
              <p className="text-xs text-tertiary">All time</p>
            </div>
          </div>

          <div className="notion-card p-6 card-hover group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
            </div>
            <div>
              <p className="text-secondary text-sm font-semibold mb-2 uppercase tracking-wide">This Month</p>
              <p className="text-4xl font-bold stat-number mb-1">
                {analyses.filter(a => {
                  const analysisDate = new Date(a.analysis_date);
                  const now = new Date();
                  return analysisDate.getMonth() === now.getMonth() && analysisDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
              <p className="text-xs text-tertiary">Current month</p>
            </div>
          </div>

          <div className="notion-card p-6 card-hover group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
                </svg>
              </div>
            </div>
            <div>
              <p className="text-secondary text-sm font-semibold mb-2 uppercase tracking-wide">Total Size</p>
              <p className="text-4xl font-bold stat-number mb-1">
                {formatFileSize(analyses.reduce((total, analysis) => total + analysis.file_size, 0))}
              </p>
              <p className="text-xs text-tertiary">Processed</p>
            </div>
          </div>

          <div className="notion-card p-6 card-hover group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div>
              <p className="text-secondary text-sm font-semibold mb-2 uppercase tracking-wide">Success Rate</p>
              <p className="text-4xl font-bold stat-number mb-1">98%</p>
              <p className="text-xs text-tertiary">Accuracy</p>
            </div>
          </div>
        </div>

        {/* Upload Button positioned under Success Rate card */}
        <div className="flex justify-end mb-8 fade-in">
          <button
            onClick={() => router.push('/upload.html')}
            className="apple-button px-5 py-2 text-sm font-semibold flex items-center shadow-lg"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Upload PDF
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {analyses.length === 0 ? (
          <div className="notion-card p-16 text-center fade-in">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 floating-animation shadow-2xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h3 className="text-4xl font-bold mb-4 text-primary">No analyses yet</h3>
            <p className="text-xl text-secondary mb-10 max-w-lg mx-auto leading-relaxed">
              Upload your first PDF to start analyzing real estate properties and extracting valuable data automatically.
            </p>
            <button
                onClick={() => router.push('/upload.html')}
              className="apple-button px-8 py-4 text-lg font-semibold flex items-center mx-auto shadow-xl"
            >
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Upload Your First PDF
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {analyses.map((analysis, index) => (
              <div 
                key={analysis.id} 
                className="notion-card p-4 card-hover fade-in group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-primary mb-2 group-hover:text-blue-600 transition-colors duration-200">
                          {analysis.original_filename}
                        </h3>
                        <div className="flex items-center space-x-6 text-sm text-secondary">
                          <span className="flex items-center font-medium">
                            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            {formatDate(analysis.analysis_date)}
                          </span>
                          <span className="flex items-center font-medium">
                            <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
                            </svg>
                            {formatFileSize(analysis.file_size)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => router.push(`/analysis/${analysis.id}`)}
                      className="apple-button px-4 py-2 text-sm font-semibold flex items-center shadow-md"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                      View
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(analysis.id)}
                      className="apple-button-secondary px-4 py-2 text-sm font-semibold flex items-center text-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>

                {/* Extracted Data Preview */}
                {Object.keys(analysis.extracted_data).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-secondary uppercase tracking-wider flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                      </svg>
                      Extracted Data
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(analysis.extracted_data).slice(0, 4).map(([key, value]) => (
                        <div key={key} className="data-card rounded-xl p-2 group-hover:scale-105 transition-transform duration-200">
                          <div className="text-xs text-secondary mb-2 font-semibold uppercase tracking-wide">{key}</div>
                          <div className="text-sm font-bold text-primary truncate">
                            {String(value) || 'N/A'}
                          </div>
                        </div>
                      ))}
                      {Object.keys(analysis.extracted_data).length > 4 && (
                        <div className="data-card rounded-xl p-2 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                          <div className="text-center">
                            <div className="text-xs text-secondary mb-1 font-semibold">More</div>
                            <div className="text-lg font-bold text-primary">
                              +{Object.keys(analysis.extracted_data).length - 4}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
          <div className="notion-card p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-primary mb-3">Delete Analysis</h3>
              <p className="text-lg text-secondary mb-8 leading-relaxed">
                Are you sure you want to delete this analysis? This action cannot be undone.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 apple-button-secondary px-6 py-3 text-base font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteAnalysis(deleteConfirm)}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl text-base font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
