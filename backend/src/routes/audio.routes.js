const express = require('express');
const router = express.Router();
const audioController = require('../controllers/audioController');
const auth = require('../middleware/auth');

// All audio routes require authentication
router.use(auth);

// Stream audio file
router.get('/stream/:noteId', audioController.streamAudio);

// Download audio file
router.get('/download/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.userId;
    
    const { Note } = require('../models/Note');
    const note = await Note.findOne({
      where: { id: noteId, userId }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${note.originalFilename}"`);
    
    // Stream the audio
    await audioController.streamAudio(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Download failed' });
  }
});

module.exports = router;
