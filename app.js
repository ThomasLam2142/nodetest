const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Route to serve list-view.html as the default index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'list-view.html'));
});

// GPU database API route
app.get('/api/gpu-database', (req, res) => {
  try {
    const gpuDataPath = path.join(__dirname, 'gpu_database.json');
    const gpuData = fs.readFileSync(gpuDataPath, 'utf8');
    const parsedData = JSON.parse(gpuData);
    res.json(parsedData);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to read GPU database', 
      message: error.message 
    });
  }
});

// Get only the GPUs array
app.get('/api/gpus', (req, res) => {
  try {
    const gpuDataPath = path.join(__dirname, 'gpu_database.json');
    const gpuData = fs.readFileSync(gpuDataPath, 'utf8');
    const parsedData = JSON.parse(gpuData);
    res.json(parsedData.gpu_database.gpus);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to read GPU database', 
      message: error.message 
    });
  }
});

// POST endpoint to add a new GPU
app.post('/api/gpus', (req, res) => {
  try {
    const gpuDataPath = path.join(__dirname, 'gpu_database.json');
    const gpuData = fs.readFileSync(gpuDataPath, 'utf8');
    const parsedData = JSON.parse(gpuData);
    
    // Validate required fields
const requiredFields = ['vendor', 'name', 'generation', 'serial_number', 'owner'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: missingFields
      });
    }
    
    // Check if serial number already exists
    const existingGpu = parsedData.gpu_database.gpus.find(
      gpu => gpu.serial_number === req.body.serial_number
    );
    
    if (existingGpu) {
      return res.status(400).json({
        error: 'A GPU with this serial number already exists',
        existing_gpu: existingGpu
      });
    }
    
    // Generate new ID (find the highest existing ID and add 1)
    const maxId = parsedData.gpu_database.gpus.reduce((max, gpu) => 
      Math.max(max, gpu.id), 0
    );
    const newId = maxId + 1;
    
    // Create new GPU object
    const newGpu = {
      id: newId,
      vendor: req.body.vendor,
      name: req.body.name,
      generation: req.body.generation,
      serial_number: req.body.serial_number,
      owner: req.body.owner,
      borrowee: req.body.borrowee || null,
status: req.body.status || 'available',
      additional_info: {}
    };
    
    // Add optional additional_info fields if provided
    if (req.body.memory) {
      newGpu.additional_info.memory = req.body.memory;
    }
    if (req.body.release_year) {
      newGpu.additional_info.release_year = parseInt(req.body.release_year);
    }
    if (req.body.purchase_date) {
      newGpu.additional_info.purchase_date = req.body.purchase_date;
    }
    
    // Add the new GPU to the array
    parsedData.gpu_database.gpus.push(newGpu);
    
    // Write back to file
    fs.writeFileSync(gpuDataPath, JSON.stringify(parsedData, null, 2));
    
    // Return success response
    res.status(201).json({
      message: 'GPU added successfully',
      id: newId,
      gpu: newGpu
    });
    
  } catch (error) {
    console.error('Error adding GPU:', error);
    res.status(500).json({ 
      error: 'Failed to add GPU', 
      message: error.message 
    });
  }
});

// PATCH endpoint to update GPU status
app.patch('/api/gpus/:id', (req, res) => {
  try {
    const gpuId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Validate status value
    const validStatuses = ['available', 'missing', 'in-use', 'loaned-out'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status', 
        validStatuses 
      });
    }
    
    const gpuDataPath = path.join(__dirname, 'gpu_database.json');
    const gpuData = fs.readFileSync(gpuDataPath, 'utf8');
    const parsedData = JSON.parse(gpuData);
    
    // Find the GPU
    const gpuIndex = parsedData.gpu_database.gpus.findIndex(gpu => gpu.id === gpuId);
    
    if (gpuIndex === -1) {
      return res.status(404).json({ error: 'GPU not found' });
    }
    
    // Update the GPU status
    parsedData.gpu_database.gpus[gpuIndex].status = status;
    
    // Write back to file
    fs.writeFileSync(gpuDataPath, JSON.stringify(parsedData, null, 2));
    
    // Return success response
    res.json({
      message: 'GPU status updated successfully',
      gpu: parsedData.gpu_database.gpus[gpuIndex]
    });
    
  } catch (error) {
    console.error('Error updating GPU status:', error);
    res.status(500).json({ 
      error: 'Failed to update GPU status', 
      message: error.message 
    });
  }
});

// API route example
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Express server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Express app listening at http://localhost:${port}`);
});
