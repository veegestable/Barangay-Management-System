const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const { Parser } = require('json2csv');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const os = require('os'); // Import the os module
const qrcode = require('qrcode-terminal'); // Import the QR code terminal package


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Schemas & Models
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
const Resident = mongoose.model('Resident', ResidentSchema);

const ResidentActivitySchema = new mongoose.Schema({
  action: { type: String, enum: ['added', 'updated', 'deleted'], required: true },
  residentName: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
const ResidentActivity = mongoose.model('ResidentActivity', ResidentActivitySchema);

const EmergencyContactSchema = new mongoose.Schema({ id: String, name: String, phone: String, email: String });
const EmergencyContact = mongoose.model('EmergencyContact', EmergencyContactSchema);

const ComplaintSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  type: String,
  message: String,
  status: String,
  date: String,
});
const Complaint = mongoose.model('Complaint', ComplaintSchema);

const AnnouncementSchema = new mongoose.Schema({
  title: String,
  caption: String,
  image: String,
  date: { type: Date, default: Date.now },
});
const Announcement = mongoose.model('Announcement', AnnouncementSchema);

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], required: true },
  status: { type: String, enum: ['approved', 'pending'], default: 'approved' },
  qrCode: String,
});
const User = mongoose.model('User', UserSchema);

// Helper for logging activities
async function logResidentActivity(action, residentName) {
  try {
    const activity = new ResidentActivity({ action, residentName });
    await activity.save();
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

// ===== Auth & User Routes =====
app.post('/users', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role)
    return res.status(400).json({ message: 'Username, password, and role required' });
  try {
    if (await User.findOne({ username }))
      return res.status(400).json({ message: 'Username exists' });
    const hashed = await bcrypt.hash(password, 10);
    const qrData = JSON.stringify({ username });
    const qrCode = await QRCode.toDataURL(qrData);
    const user = new User({
      username,
      password: hashed,
      role,
      status: role === 'admin' ? 'pending' : 'approved',
      qrCode,
    });
    await user.save();
    const msg =
      role === 'admin'
        ? 'Admin account request submitted. Awaiting approval.'
        : 'User account created successfully.';
    res.status(201).json({ message: msg, qrCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

app.post('/users/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if the admin account is rejected
    if (user.role === 'admin' && user.status === 'rejected') {
      return res.status(403).json({ message: 'Admin account has been rejected' });
    }

    // Check if the admin account is pending
    if (user.role === 'admin' && user.status !== 'approved') {
      return res.status(403).json({ message: 'Admin account not approved yet' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({ message: 'Login successful', username: user.username, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.post('/users/login-with-qr', async (req, res) => {
  const { qrData } = req.body; // e.g., { username: "sampleUser" }
  try {
    const user = await User.findOne({ username: qrData.username });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if the admin account is rejected
    if (user.role === 'admin' && user.status === 'rejected') {
      return res.status(403).json({ message: 'Admin account has been rejected' });
    }

    // Check if the admin account is pending
    if (user.role === 'admin' && user.status !== 'approved') {
      return res.status(403).json({ message: 'Admin account not approved yet' });
    }

    res.json({ message: 'QR login successful', username: user.username, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'QR login failed' });
  }
});


// Admin approval
app.get('/admin/requests', async (req, res) => {
  try {
    const pendingAdmins = await User.find({ role: 'admin', status: 'pending' });
    res.json(pendingAdmins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch pending admins' });
  }
});

app.put('/admin/requests/:username/approve', async (req, res) => {
  const { status } = req.body; // Expect 'approved' or 'rejected'
  try {
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { status }, // Update the status to 'approved' or 'rejected'
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    const message =
      status === 'approved'
        ? 'Admin approved successfully'
        : 'Admin rejected successfully';
    res.json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update admin status' });
  }
});

// ===== Resident CRUD & Activity Logging =====
app.post('/residents', async (req, res) => {
  try {
    const data = req.body;
    data.id = uuidv4(); // Generate a unique ID for the resident
    await new Resident(data).save();
    await logResidentActivity('added', `${data.firstName} ${data.lastName}`);
    res.status(201).json({ message: 'Resident saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save resident' });
  }
});


app.post('/residents/bulk', async (req, res) => {
  const residents = req.body;
  try {
    const savedResidents = [];

    for (const resident of residents) {
      const id = uuidv4(); // Generate a unique ID for each resident
      const newResident = new Resident({ ...resident, id });
      await newResident.save();
      await logResidentActivity('added', `${resident.firstName} ${resident.lastName}`);
      savedResidents.push(newResident);
    }

    res.status(201).json({ message: 'Residents imported successfully', data: savedResidents });
  } catch (error) {
    console.error("Error importing residents:", error);
    res.status(500).json({ message: 'Failed to import residents' });
  }
});


app.get('/residents', async (req, res) => {
  try {    
    const list = await Resident.find();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch residents' });
  }
});

// Fetch 5 most recent activities
app.get('/residents/recent-activities', async (req, res) => {
  try {
    const activities = await ResidentActivity.find()
      .sort({ timestamp: -1 })
      .limit(5);
    res.status(200).json(activities);
  } catch (err) {
    console.error('Error fetching recent activities:', err);
    res.status(500).json({ message: 'Failed to fetch recent activities' });
  }
});

// ===== CSV Export =====
app.get('/residents/export', async (req, res) => {
  try {
    const list = await Resident.find();
    if (!list.length) return res.status(404).json({ message: 'No residents found' });

    const fields = [
      'id', 'firstName', 'middleName', 'lastName', 'dob', 'age',
      'sex', 'address', 'contact', 'civilStatus', 'occupation',
      'voterStatus', 'specialCategory'
    ];
    const csv = new Parser({ fields }).parse(list);

    res.header('Content-Type', 'text/csv');
    res.attachment('residents.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to export residents' });
  }
});


app.get('/residents/:id', async (req, res) => {
  try {
    const r = await Resident.findOne({ id: req.params.id });
    if (!r) return res.status(404).json({ message: 'Resident not found' });
    res.json(r);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch resident' });
  }
});
app.put('/residents/:id', async (req, res) => {
  try {
    const upd = req.body;
    const r = await Resident.findOneAndUpdate({ id: req.params.id }, upd, { new: true });
    if (!r) return res.status(404).json({ message: 'Resident not found' });
    await logResidentActivity('updated', `${upd.firstName} ${upd.lastName}`);
    res.json({ message: 'Resident updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update resident' });
  }
});
app.delete('/residents/:id', async (req, res) => {
  try {
    const r = await Resident.findOneAndDelete({ id: req.params.id });
    if (!r) return res.status(404).json({ message: 'Resident not found' });
    await logResidentActivity('deleted', `${r.firstName} ${r.lastName}`);
    res.json({ message: 'Resident deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete resident' });
  }
});






// ===== Emergency Contacts =====
app.post('/emergency-contacts', async (req, res) => {
  try {
    await new EmergencyContact(req.body).save();
    res.status(201).json({ message: 'Emergency contact saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save emergency contact' });
  }
});
app.get('/emergency-contacts', async (req, res) => {
  try {
    res.json(await EmergencyContact.find());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch emergency contacts' });
  }
});
app.get('/emergency-contacts/export', async (req, res) => {
  try {
    const contacts = await EmergencyContact.find();
    if (!contacts.length) return res.status(404).json({ message: 'No emergency contacts found' });

    const fields = ['id', 'name', 'phone', 'email'];
    const csv = new Parser({ fields }).parse(contacts);

    res.header('Content-Type', 'text/csv');
    res.attachment('emergency_contacts.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to export emergency contacts' });
  }
});

// ===== Complaints =====
app.post('/complaints', async (req, res) => {
  try {
    await new Complaint(req.body).save();
    res.status(201).json({ message: 'Complaint saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save complaint' });
  }
});
app.get('/complaints', async (req, res) => {
  try {
    res.json(await Complaint.find());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
});
app.put('/complaints/:id', async (req, res) => {
  try {
    const c = await Complaint.findOneAndUpdate({ id: req.params.id }, { status: req.body.status }, { new: true });
    if (!c) return res.status(404).json({ message: 'Complaint not found' });
    res.json({ message: 'Complaint status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update complaint status' });
  }
});
app.delete('/complaints/:id', async (req, res) => {
  try {
    const c = await Complaint.findOneAndDelete({ id: req.params.id });
    if (!c) return res.status(404).json({ message: 'Complaint not found' });
    res.json({ message: 'Complaint deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete complaint' });
  }
});

// ===== Announcements =====
app.post('/announcements', async (req, res) => {
  try {
    const a = new Announcement(req.body);
    await a.save();
    res.status(201).json({ message: 'Announcement posted successfully', announcement: a });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to post announcement' });
  }
});
app.get('/announcements', async (req, res) => {
  try {
    res.json(await Announcement.find().sort({ date: -1 }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});
app.get('/announcements/recent', async (req, res) => {
  try {
    res.json(await Announcement.find().sort({ date: -1 }).limit(5));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch recent announcements' });
  }
});
app.get('/announcements/export', async (req, res) => {
  try {
    const announcements = await Announcement.find();
    if (!announcements.length) return res.status(404).json({ message: 'No announcements found' });

    const fields = ['title', 'caption', 'image', 'date'];
    const csv = new Parser({ fields }).parse(announcements);

    res.header('Content-Type', 'text/csv');
    res.attachment('announcements.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to export announcements' });
  }
});
app.delete('/announcements/:id', async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
});

// ===== Seed Default Admin =====
async function seedDefaultAdmin() {
  try {
    if (!(await User.findOne({ username: 'admin' }))) {
      const hash = await bcrypt.hash('admin', 10);
      const qr = await QRCode.toDataURL(JSON.stringify({ username: 'admin' }));
      await new User({ username: 'admin', password: hash, role: 'admin', status: 'approved', qrCode: qr }).save();
      console.log('Default admin account created');
    } else {
      console.log('Default admin exists');
    }
  } catch (err) {
    console.error('Error creating default admin:', err);
  }
}
seedDefaultAdmin();

// Function to get the local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over internal (i.e., 127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost'; // Fallback to localhost if no IP is found
}

// Start server
app.listen(PORT, () => {
  const localIp = getLocalIpAddress(); // Dynamically get the local IP address
  const appUrl = `http://${localIp}:${PORT}`;
  console.log(`Server running on ${appUrl}`);

  // Generate and display the QR code in the terminal
  qrcode.generate(appUrl, { small: true }, (qr) => {
    console.log("Scan this QR code to access the application on your mobile device:");
    console.log(qr);
  });
});

app.get('/users/:username/qr', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ qrCode: user.qrCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch QR code' });
  }
});
