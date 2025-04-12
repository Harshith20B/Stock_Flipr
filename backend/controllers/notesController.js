const Note = require('../models/Note');
const User = require('../models/User');

// Add a note for a specific stock
const addNote = async (req, res) => {
  const { symbol, note } = req.body;
  const userId = req.session.user?.id || req.user._id; // Assuming you're using session-based authentication

  if (!symbol || !note) {
    return res.status(400).json({ message: 'Stock symbol and note content are required' });
  }

  try {
    // Check if the user already has a note for the given stock symbol
    const existingNote = await Note.findOne({ userId, symbol });

    if (existingNote) {
      return res.status(400).json({ message: 'You already have a note for this stock' });
    }

    // Create a new note
    const newNote = new Note({
      userId,
      symbol,
      note
    });

    await newNote.save();

    res.status(201).json({
      message: 'Note created successfully',
      note: newNote
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// Update a note for a specific stock
const updateNote = async (req, res) => {
  const { symbol, note } = req.body;
  const userId = req.session.user?.id || req.user._id;

  if (!symbol || !note) {
    return res.status(400).json({ message: 'Stock symbol and note content are required' });
  }

  try {
    // Find the note to update
    const existingNote = await Note.findOneAndUpdate(
      { userId, symbol },
      { note },
      { new: true } // Return the updated note
    );

    if (!existingNote) {
      return res.status(404).json({ message: 'Note not found for this stock symbol' });
    }

    res.status(200).json({
      message: 'Note updated successfully',
      note: existingNote
    });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// Get a note for a specific stock
const getNote = async (req, res) => {
  const { symbol } = req.params;
  const userId = req.session.user?.id || req.user._id;

  try {
    // Find the note for the given stock symbol
    const note = await Note.findOne({ userId, symbol });

    if (!note) {
      return res.status(404).json({ message: 'Note not found for this stock symbol' });
    }

    res.status(200).json({
      message: 'Note retrieved successfully',
      note
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// Delete a note for a specific stock
const deleteNote = async (req, res) => {
  const { symbol } = req.params;
  const userId = req.session.user?.id || req.user._id;

  if (!symbol) {
    return res.status(400).json({ message: 'Stock symbol is required' });
  }

  try {
    // Find and delete the note
    const deletedNote = await Note.findOneAndDelete({ userId, symbol });

    if (!deletedNote) {
      return res.status(404).json({ message: 'Note not found for this stock symbol' });
    }

    res.status(200).json({
      message: 'Note deleted successfully',
      note: deletedNote
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
  const getAllNotes = async (req, res) => {
    const userId = req.session.user?.id || req.user._id;

    try {
      // Find all notes for the current user
      const notes = await Note.find({ userId }).sort({ updatedAt: -1 });

      res.status(200).json({
        message: 'Notes retrieved successfully',
        notes
      });
    } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
  };
};

module.exports = {
  addNote,
  updateNote,
  getNote,
  deleteNote
};
