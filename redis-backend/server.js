const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
console.log('MongoDB URI:', process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Mongoose Schemas and Models
const ResidentSchema = new mongoose.Schema({
  id: String,
  firstName: String,
  middleName: String,
  lastName: String,
  dob: String,
  age: Number,
  sex: String,
  address: String,
  contact: String,
  civilStatus: String,
  occupation: String,
  voterStatus: String,
  specialCategory: String,
});

const EmergencyContactSchema = new mongoose.Schema({
  id: String,
  name: String,
  phone: String,
  email: String,
});

const ComplaintSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  type: String,
  message: String,
  status: String,
  date: String,
});

const Resident = mongoose.model('Resident', ResidentSchema);
const EmergencyContact = mongoose.model('EmergencyContact', EmergencyContactSchema);
const Complaint = mongoose.model('Complaint', ComplaintSchema);

// CRUD Operations

// Route to save resident data
app.post('/residents', async (req, res) => {
  const residentData = req.body;

  // Validate input fields
  if (!residentData.id || !residentData.firstName || !residentData.middleName || !residentData.lastName || !residentData.dob || !residentData.age || !residentData.sex || !residentData.address || !residentData.contact || !residentData.civilStatus || !residentData.occupation || !residentData.voterStatus || !residentData.specialCategory) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const resident = new Resident(residentData);
    await resident.save();
    res.status(201).json({ message: 'Resident saved successfully' });
  } catch (error) {
    console.error('Error saving resident:', error);
    res.status(500).json({ message: 'Failed to save resident' });
  }
});

// Route to save emergency contact
app.post('/emergency-contacts', async (req, res) => {
  const contactData = req.body;

  // Validate input fields
  if (!contactData.id || !contactData.name || !contactData.phone) {
    return res.status(400).json({ message: 'ID, Name, and Phone are required' });
  }

  try {
    const contact = new EmergencyContact(contactData);
    await contact.save();
    res.status(201).json({ message: 'Emergency contact saved successfully' });
  } catch (error) {
    console.error('Error saving emergency contact:', error);
    res.status(500).json({ message: 'Failed to save emergency contact' });
  }
});

// Route to save complaint
app.post('/complaints', async (req, res) => {
  const complaintData = req.body;

  // Validate input fields
  if (!complaintData.id || !complaintData.name || !complaintData.type || !complaintData.message || !complaintData.status || !complaintData.date) {
    return res.status(400).json({ message: 'ID, Name, Type, Message, Status, and Date are required' });
  }

  try {
    const complaint = new Complaint(complaintData);
    await complaint.save();
    res.status(201).json({ message: 'Complaint saved successfully' });
  } catch (error) {
    console.error('Error saving complaint:', error);
    res.status(500).json({ message: 'Failed to save complaint' });
  }
});

// Read (R)
app.get('/residents/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const resident = await Resident.findOne({ id });
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }
    res.json(resident);
  } catch (error) {
    console.error('Error fetching resident:', error);
    res.status(500).json({ message: 'Failed to fetch resident' });
  }
});

// Read all residents
app.get('/residents', async (req, res) => {
  try {
    const residents = await Resident.find();
    res.json(residents);
  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json({ message: 'Failed to fetch residents' });
  }
});

// Read all emergency contacts
app.get('/emergency-contacts', async (req, res) => {
  try {
    const contacts = await EmergencyContact.find();
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    res.status(500).json({ message: 'Failed to fetch emergency contacts' });
  }
});

// Read all complaints
app.get('/complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find();
    res.json(complaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
});

// Update (U)
app.put('/residents/:id', async (req, res) => {
  const id = req.params.id;
  const updateData = req.body;

  try {
    const resident = await Resident.findOneAndUpdate({ id }, updateData, { new: true });
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }
    res.status(200).json({ message: 'Resident updated successfully', resident });
  } catch (error) {
    console.error('Error updating resident:', error);
    res.status(500).json({ message: 'Failed to update resident' });
  }
});

// Update complaint status
app.put('/complaints/:id', async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required to update' });
  }

  try {
    const complaint = await Complaint.findOneAndUpdate({ id }, { status }, { new: true });
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    res.status(200).json({ message: 'Complaint status updated successfully', complaint });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    res.status(500).json({ message: 'Failed to update complaint status' });
  }
});

// Delete (D)
app.delete('/residents/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const resident = await Resident.findOneAndDelete({ id });
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }
    res.status(200).json({ message: 'Resident deleted successfully' });
  } catch (error) {
    console.error('Error deleting resident:', error);
    res.status(500).json({ message: 'Failed to delete resident' });
  }
});

// Delete complaint
app.delete('/complaints/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const complaint = await Complaint.findOneAndDelete({ id });
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    res.status(200).json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).json({ message: 'Failed to delete complaint' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});