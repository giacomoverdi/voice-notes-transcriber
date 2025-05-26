const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notesController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// CRUD operations
router.get('/', notesController.getAllNotes);
router.get('/search', notesController.searchNotes);
router.get('/stats', notesController.getStats);
router.get('/:id', notesController.getNoteById);
router.put('/:id', notesController.updateNote);
router.delete('/:id', notesController.deleteNote);

// Special operations
router.post('/:id/favorite', notesController.toggleFavorite);
router.post('/:id/archive', notesController.toggleArchive);
router.post('/:id/sync-notion', notesController.syncToNotion);

module.exports = router;
