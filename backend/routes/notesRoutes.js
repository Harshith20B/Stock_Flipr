const express = require('express');
const router = express.Router();
const { addNote, getNote, updateNote, deleteNote } = require('../controllers/notesController');
const isAuthenticated = require('../middleware/auth');  // Middleware to verify user

// Use the authentication middleware for all routes
router.use(isAuthenticated);

// Add a note for a stock
router.post('/:symbol/notes', addNote);

// Get a note for a stock
router.get('/:symbol/notes', getNote);

// Update a note for a stock
router.put('/:symbol/notes', updateNote);

// Delete a note for a stock
router.delete('/:symbol/notes', deleteNote);

module.exports = router;
