// Task1: initiate app and run server at 3000
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const path=require('path');
app.use(express.static(path.join(__dirname+'/dist/FrontEnd')));

// Task2: create mongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.set('strictQuery', true);
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Connected to MongoDB Atlas'))
        .catch((error) => console.error('MongoDB connection error:', error.message));
} else {
    console.warn('MONGODB_URI is not set. Add it to your .env file.');
}

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    salary: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);

const asyncHandler = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const employeeRoutes = ['/employeelist', '/api/employeelist'];

//Task 2 : write api with error handling and appropriate api mentioned in the TODO below

//TODO: get data from db  using api '/api/employeelist'
employeeRoutes.forEach((route) => {
    app.get(route, asyncHandler(async (req, res) => {
        const employees = await Employee.find().sort({ createdAt: -1 });
        res.status(200).json(employees);
    }));
});

//TODO: get single data from db  using api '/api/employeelist/:id'
employeeRoutes.forEach((route) => {
    app.get(`${route}/:id`, asyncHandler(async (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid employee ID' });
        }
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.status(200).json(employee);
    }));
});

//TODO: send data from db using api '/api/employeelist'
//Request body format:{name:'',location:'',position:'',salary:''}
employeeRoutes.forEach((route) => {
    app.post(route, asyncHandler(async (req, res) => {
        const { name, location, position, salary } = req.body;
        if (!name || !location || !position || salary === undefined || salary === '') {
            return res.status(400).json({
                message: 'name, location, position and salary are required'
            });
        }
        const numericSalary = Number(salary);
        if (!Number.isFinite(numericSalary) || numericSalary < 0) {
            return res.status(400).json({ message: 'Salary must be a valid non-negative number' });
        }
        const employee = await Employee.create({
            name, location, position, salary: numericSalary
        });
        res.status(201).json(employee);
    }));
});

//TODO: delete a employee data from db by using api '/api/employeelist/:id'
employeeRoutes.forEach((route) => {
    app.delete(`${route}/:id`, asyncHandler(async (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid employee ID' });
        }
        const employee = await Employee.findByIdAndDelete(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.status(200).json({ message: 'Employee deleted successfully', employee });
    }));
});

//TODO: Update  a employee data from db by using api '/api/employeelist'
//Request body format:{name:'',location:'',position:'',salary:''}
employeeRoutes.forEach((route) => {
    app.put(route, asyncHandler(async (req, res) => {
        // The provided frontend sends the employee identifier with the update body.
        const id = req.body._id || req.body.id || req.body.employeeId;
        if (!id) {
            return res.status(400).json({ message: 'Employee ID (_id, id or employeeId) is required' });
        }
        if (!isValidId(String(id))) {
            return res.status(400).json({ message: 'Invalid employee ID' });
        }

        const updates = {};
        ['name', 'location', 'position', 'salary'].forEach((field) => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });
        if (updates.salary !== undefined) {
            updates.salary = Number(updates.salary);
            if (!Number.isFinite(updates.salary) || updates.salary < 0) {
                return res.status(400).json({ message: 'Salary must be a valid non-negative number' });
            }
        }
        const employee = await Employee.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.status(200).json(employee);
    }));
});

// Handle database and unexpected errors.
app.use((err, req, res, next) => {
    console.error(err);
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error' });
});

//! dont delete this code. it connects the front end file.
app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname + '/dist/Frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
