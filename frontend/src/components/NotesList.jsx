import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Clock, Star, Archive, Play, Tag } from 'lucide-react';

function NotesList({ notes, onNoteClick, onToggleFavorite, onToggleArchive, selectedNote }) {
  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="notes-list">
      {notes.map((note) => (
        <div 
          key={note.id} 
          className={`note-card ${selectedNote?.id === note.id ? 'selected' : ''}`}
          onClick={() => onNoteClick(note)}
        >
          <div className="note-header">
            <div className="flex-1">
              <h3 className="note-title">{note.title}</h3>
              <div className="note-meta">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                </span>
                {note.duration && (
                  <span className="flex items-center gap-1">
                    <Play size={14} />
                    {formatDuration(note.duration)}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                className={`icon-button ${note.isFavorite ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(note.id);
                }}
                title="Toggle favorite"
              >
                <Star size={18} fill={note.isFavorite ? 'currentColor' : 'none'} />
              </button>
              <button
                className="icon-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleArchive(note.id);
                }}
                title={note.isArchived ? 'Unarchive' : 'Archive'}
              >
                <Archive size={18} />
              </button>
            </div>
          </div>

          {note.transcription && (
            <p className="note-transcription">
              {note.transcription}
            </p>
          )}

          {note.summary && (
            <div className="note-summary">
              <strong>Summary:</strong> {note.summary}
            </div>
          )}

          {note.actionItems && note.actionItems.length > 0 && (
            <div className="note-action-items">
              <strong>Action Items:</strong>
              <ul className="mt-1">
                {note.actionItems.slice(0, 3).map((item, index) => (
                  <li key={index} className="text-sm">
                    • {item.task} {item.priority && `(${item.priority})`}
                  </li>
                ))}
                {note.actionItems.length > 3 && (
                  <li className="text-sm text-gray-500">
                    +{note.actionItems.length - 3} more...
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="note-tags">
            {note.categories?.map((category) => (
              <span key={category} className="tag category">
                {category}
              </span>
            ))}
            {note.tags?.map((tag) => (
              <span key={tag} className="tag">
                <Tag size={12} /> {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default NotesList;