import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Search, Mic, Calendar, Clock, Tag, Archive, Star, ChevronRight, Mail } from 'lucide-react';
import NotesList from '../components/NotesList';
import AudioPlayer from '../components/AudioPlayer';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';

function Dashboard() {
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [view, setView] = useState('active'); // active, archived, favorites

  // Fetch notes
  const { data: notesData, isLoading, refetch } = useQuery(
    ['notes', view, searchQuery, selectedCategories],
    () => api.getNotes({
      archived: view === 'archived',
      favorite: view === 'favorites' ? true : null,
      q: searchQuery,
      categories: selectedCategories.join(',')
    }),
    {
      refetchInterval: 30000 // Refetch every 30 seconds
    }
  );

  // Fetch stats
  const { data: stats } = useQuery('stats', api.getStats);

  const handleNoteClick = (note) => {
    setSelectedNote(note);
  };

  const handleToggleFavorite = async (noteId) => {
    await api.toggleFavorite(noteId);
    refetch();
  };

  const handleToggleArchive = async (noteId) => {
    await api.toggleArchive(noteId);
    refetch();
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <a href="/" className="logo">
              <div className="logo-icon">
                <Mic size={24} />
              </div>
              <span>Voice Notes</span>
            </a>
            
            <nav className="flex items-center gap-4">
              <a href="/settings" className="btn btn-secondary">
                Settings
              </a>
              <div className="btn btn-primary flex items-center gap-2">
                <Mail size={18} />
                <span className="hidden sm:inline">
                  {import.meta.env.VITE_POSTMARK_ADDRESS || 'Send Voice Note'}
                </span>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {/* Stats Cards */}
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Notes</div>
                <div className="stat-value">{stats.overview?.totalNotes || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Duration</div>
                <div className="stat-value">
                  {Math.round((stats.overview?.totalDuration || 0) / 60)}m
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">This Week</div>
                <div className="stat-value">{stats.recentActivity?.lastWeek || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Categories</div>
                <div className="stat-value">{stats.overview?.uniqueCategories || 0}</div>
              </div>
            </div>
          )}

          <div className="dashboard-grid">
            {/* Sidebar */}
            <aside className="sidebar">
              <div className="sidebar-section">
                <h3 className="sidebar-title">Views</h3>
                <nav>
                  <a 
                    href="#" 
                    className={`nav-link ${view === 'active' ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setView('active');
                    }}
                  >
                    <Mic size={18} />
                    <span>Active Notes</span>
                  </a>
                  <a 
                    href="#" 
                    className={`nav-link ${view === 'favorites' ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setView('favorites');
                    }}
                  >
                    <Star size={18} />
                    <span>Favorites</span>
                  </a>
                  <a 
                    href="#" 
                    className={`nav-link ${view === 'archived' ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setView('archived');
                    }}
                  >
                    <Archive size={18} />
                    <span>Archived</span>
                  </a>
                </nav>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Categories</h3>
                <CategoryFilter
                  categories={['meeting', 'idea', 'todo', 'personal', 'work']}
                  selected={selectedCategories}
                  onToggle={handleCategoryToggle}
                />
              </div>

              {/* Quick Instructions */}
              <div className="sidebar-section">
                <h3 className="sidebar-title">Quick Start</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>📧 Send voice notes to:</p>
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded break-all">
                    {import.meta.env.VITE_POSTMARK_ADDRESS || 'your-address@inbound.postmarkapp.com'}
                  </p>
                  <p className="mt-2">✨ We'll transcribe and organize them automatically!</p>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="notes-container">
              <div className="notes-header">
                <h2 className="text-xl font-semibold">
                  {view === 'active' && 'Active Notes'}
                  {view === 'favorites' && 'Favorite Notes'}
                  {view === 'archived' && 'Archived Notes'}
                </h2>
                
                <SearchBar onSearch={handleSearch} />
              </div>

              {isLoading ? (
                <div className="loading">
                  <div className="spinner"></div>
                </div>
              ) : notesData?.notes?.length > 0 ? (
                <>
                  <NotesList
                    notes={notesData.notes}
                    onNoteClick={handleNoteClick}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleArchive={handleToggleArchive}
                    selectedNote={selectedNote}
                  />

                  {/* Pagination */}
                  {notesData.pagination && notesData.pagination.pages > 1 && (
                    <div className="flex justify-center mt-6 pb-6">
                      <div className="flex gap-2">
                        {Array.from({ length: notesData.pagination.pages }, (_, i) => (
                          <button
                            key={i}
                            className={`px-3 py-1 rounded ${
                              notesData.pagination.page === i + 1
                                ? 'bg-primary text-white'
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            onClick={() => {
                              // Implement pagination
                              console.log('Go to page', i + 1);
                            }}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Mic size={80} strokeWidth={1} />
                  </div>
                  <h3 className="empty-title">No notes yet</h3>
                  <p className="empty-description">
                    Send your first voice note to get started
                  </p>
                  <div className="mt-6 bg-gray-100 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-sm text-gray-600 mb-2">Send voice notes to:</p>
                    <p className="font-mono text-sm bg-white p-2 rounded border border-gray-200 break-all">
                      {import.meta.env.VITE_POSTMARK_ADDRESS || 'your-address@inbound.postmarkapp.com'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Audio Player Modal */}
      {selectedNote && (
        <AudioPlayer
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
        />
      )}

      {/* Styles for toggle checkbox */}
      <style jsx>{`
        .toggle-checkbox {
          position: relative;
          width: 44px;
          height: 24px;
          appearance: none;
          background-color: #e5e7eb;
          border-radius: 24px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .toggle-checkbox:checked {
          background-color: #6366f1;
        }
        
        .toggle-checkbox::before {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          background-color: white;
          transition: transform 0.3s;
        }
        
        .toggle-checkbox:checked::before {
          transform: translateX(20px);
        }

        .icon-button {
          padding: 0.5rem;
          border-radius: 0.375rem;
          transition: all 0.2s;
          color: #6b7280;
        }
        
        .icon-button:hover {
          background-color: #f3f4f6;
          color: #374151;
        }
        
        .icon-button.active {
          color: #6366f1;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;