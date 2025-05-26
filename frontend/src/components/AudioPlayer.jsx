import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, X, Download, Share2, Volume2 } from 'lucide-react';
import { format } from 'date-fns';
import logger from '../utils/logger';
import api from '../services/api';

function AudioPlayer({ note, onClose }) {
  const waveformRef = useRef(null);
  const audioRef = useRef(null);
  const wavesurfer = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!waveformRef.current || !audioRef.current) return;

    try {
      const token = localStorage.getItem('token');
      logger.info('Token check:', { 
        hasToken: !!token,
        tokenLength: token?.length,
        token: token,
        noteId: note.id
      });

      if (!token) {
        setError('Token di autenticazione non trovato');
        return;
      }

      // Verifica se il token è scaduto
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Converti in millisecondi
        if (Date.now() > exp) {
          logger.error('Token scaduto:', {
            exp: new Date(exp),
            now: new Date()
          });
          setError('Token di autenticazione scaduto');
          return;
        }
      } catch (error) {
        logger.error('Errore nel parsing del token:', error);
        setError('Token di autenticazione non valido');
        return;
      }

      // Initialize WaveSurfer
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#9ca3af',
        progressColor: '#6366f1',
        cursorColor: '#6366f1',
        barWidth: 2,
        barRadius: 3,
        responsive: true,
        height: 80,
        normalize: true,
        backend: 'MediaElement',
        media: audioRef.current
      });

      // Load audio with authentication
      const audioUrl = `/api/audio/stream/${note.id}`;
      logger.info('Loading audio:', { 
        audioUrl, 
        noteId: note.id,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'audio/*'
        }
      });

      // Set up audio element with authentication
      const audio = audioRef.current;
      audio.src = audioUrl;
      audio.setAttribute('crossorigin', 'anonymous');
      
      // Add authentication headers
      const xhr = new XMLHttpRequest();
      xhr.open('GET', audioUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Accept', 'audio/*');
      xhr.responseType = 'blob';
      
      xhr.onload = function() {
        logger.info('XHR response:', {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: xhr.getAllResponseHeaders()
        });

        if (xhr.status === 200) {
          const blob = xhr.response;
          const url = URL.createObjectURL(blob);
          audio.src = url;
          wavesurfer.current.load(url);
        } else {
          logger.error('Error loading audio:', {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: xhr.getAllResponseHeaders(),
            noteId: note.id
          });
          setError('Errore nel caricamento dell\'audio: ' + xhr.statusText);
        }
      };
      
      xhr.onerror = function(e) {
        logger.error('Error loading audio:', {
          error: e,
          noteId: note.id,
          url: audioUrl,
          headers: xhr.getAllResponseHeaders()
        });
        setError('Errore nel caricamento dell\'audio');
      };
      
      xhr.send();

      // Event handlers
      wavesurfer.current.on('ready', () => {
        const audioDuration = wavesurfer.current.getDuration();
        setDuration(audioDuration);
        logger.info('Audio loaded:', { 
          duration: audioDuration,
          noteDuration: note.duration,
          noteId: note.id
        });
      });

      wavesurfer.current.on('error', (error) => {
        logger.error('WaveSurfer error:', { 
          error: error.message,
          noteId: note.id 
        });
        setError('Errore nel caricamento dell\'audio: ' + error.message);
      });

      wavesurfer.current.on('audioprocess', () => {
        const currentTime = wavesurfer.current.getCurrentTime();
        setCurrentTime(currentTime);
      });

      wavesurfer.current.on('play', () => {
        setIsPlaying(true);
        logger.info('Audio playing:', { noteId: note.id });
      });

      wavesurfer.current.on('pause', () => {
        setIsPlaying(false);
        logger.info('Audio paused:', { noteId: note.id });
      });

      return () => {
        wavesurfer.current?.destroy();
      };
    } catch (error) {
      logger.error('Error initializing WaveSurfer:', {
        error: error.message,
        noteId: note.id
      });
      setError('Errore nell\'inizializzazione del player: ' + error.message);
    }
  }, [note.id, note.duration]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      logger.info('Play/Pause clicked:', { 
        isPlaying, 
        currentTime: wavesurfer.current.getCurrentTime(),
        duration: wavesurfer.current.getDuration()
      });
      wavesurfer.current.playPause();
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(newVolume);
    }
  };

  const handleDownload = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      logger.error('No authentication token found');
      return;
    }

    const downloadUrl = `/api/audio/download/${note.id}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', note.originalFilename);
    
    // Usa l'istanza di Axios configurata
    api.get(downloadUrl, {
      responseType: 'blob',
      headers: {
        'Accept': 'audio/*'
      }
    })
    .then(response => {
      const url = window.URL.createObjectURL(response.data);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .catch(error => {
      logger.error('Download error:', error);
      alert('Errore durante il download del file');
    });
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold">{note.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Audio Player */}
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            <audio ref={audioRef} style={{ display: 'none' }} />
            <div ref={waveformRef} className="mb-4" />
            
            {error && (
              <div className="text-red-500 mb-4 text-center">
                {error}
              </div>
            )}
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-white text-sm">
                {formatTime(currentTime)}
              </span>
              <span className="text-white text-sm">
                {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePlayPause}
                className="play-button"
                disabled={!!error}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <div className="flex items-center gap-2">
                <Volume2 size={20} className="text-white" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24"
                  disabled={!!error}
                />
              </div>

              <button
                onClick={handleDownload}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
                title="Download"
                disabled={!!error}
              >
                <Download size={20} />
              </button>
            </div>
          </div>

          {/* Note Details */}
          <div className="space-y-4">
            {/* Metadata */}
            <div className="flex gap-4 text-sm text-gray-500">
              <span>Created: {format(new Date(note.createdAt), 'PPP')}</span>
              {note.duration && <span>Duration: {note.duration}s</span>}
              {note.language && <span>Language: {note.language.toUpperCase()}</span>}
            </div>

            {/* Categories */}
            {note.categories?.length > 0 && (
              <div className="note-tags">
                {note.categories.map((category) => (
                  <span key={category} className="tag category">
                    {category}
                  </span>
                ))}
              </div>
            )}

            {/* Summary */}
            {note.summary && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-gray-700">{note.summary}</p>
              </div>
            )}

            {/* Action Items */}
            {note.actionItems?.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Action Items</h3>
                <ul className="space-y-1">
                  {note.actionItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <input type="checkbox" className="mt-1" />
                      <span>
                        {item.task}
                        {item.priority && (
                          <span className={`ml-2 text-xs px-2 py-1 rounded ${
                            item.priority === 'high' ? 'bg-red-100 text-red-700' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {item.priority}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Transcription */}
            {note.transcription && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Full Transcription</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{note.transcription}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;