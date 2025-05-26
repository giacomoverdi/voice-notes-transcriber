import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Mail, Bell, Globe, Link2, Check, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    autoTranscribe: true,
    emailNotifications: true,
    dailySummary: false,
    notionSync: false,
    language: 'en'
  });
  const [notionConfig, setNotionConfig] = useState({
    apiKey: '',
    databaseId: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
      setSettings(userData.settings || settings);
    } catch (error) {
      toast.error('Failed to load settings');
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await api.updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotionConnect = async () => {
    if (!notionConfig.apiKey || !notionConfig.databaseId) {
      toast.error('Please enter both API key and Database ID');
      return;
    }

    setIsSaving(true);
    try {
      await api.configureNotion(notionConfig.apiKey, notionConfig.databaseId);
      toast.success('Notion connected successfully');
      setSettings(prev => ({ ...prev, notionSync: true }));
      loadUserData();
    } catch (error) {
      toast.error('Failed to connect Notion');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    api.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
            
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {user && (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mail size={24} />
                Account Information
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Name</label>
                  <p className="font-medium">{user.name || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Member Since</label>
                  <p className="font-medium">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Total Notes</label>
                  <p className="font-medium">{user.usage?.totalNotes || 0}</p>
                </div>
              </div>
            </div>

            {/* General Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Bell size={24} />
                General Settings
              </h2>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto-transcribe</div>
                    <div className="text-sm text-gray-500">
                      Automatically transcribe voice notes when received
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoTranscribe}
                    onChange={(e) => handleSettingChange('autoTranscribe', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email notifications</div>
                    <div className="text-sm text-gray-500">
                      Receive email when transcription is complete
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Daily summary</div>
                    <div className="text-sm text-gray-500">
                      Receive daily email summary of your voice notes
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dailySummary}
                    onChange={(e) => handleSettingChange('dailySummary', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </label>

                <div>
                  <label className="font-medium mb-2 block">
                    <Globe size={16} className="inline mr-2" />
                    Default Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notion Integration */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Link2 size={24} />
                Notion Integration
              </h2>
              
              {user.notionCredentials ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <Check size={20} />
                    <span className="font-medium">Connected to Notion</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Database: {user.notionCredentials.databaseName}
                  </p>
                  <button
                    className="text-red-600 hover:text-red-700 text-sm"
                    onClick={() => {/* Handle disconnect */}}
                  >
                    Disconnect Notion
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Connect your Notion workspace to automatically sync transcribed notes.
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Notion API Key
                    </label>
                    <input
                      type="password"
                      value={notionConfig.apiKey}
                      onChange={(e) => setNotionConfig(prev => ({ 
                        ...prev, 
                        apiKey: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="secret_..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Database ID
                    </label>
                    <input
                      type="text"
                      value={notionConfig.databaseId}
                      onChange={(e) => setNotionConfig(prev => ({ 
                        ...prev, 
                        databaseId: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="32-character ID"
                    />
                  </div>
                  
                  <button
                    onClick={handleNotionConnect}
                    disabled={isSaving}
                    className="btn btn-primary"
                  >
                    Connect Notion
                  </button>
                  
                  <div className="text-sm text-gray-500">
                    <a 
                      href="https://www.notion.so/my-integrations" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      Create Notion integration →
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="btn btn-primary flex items-center gap-2"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Settings;