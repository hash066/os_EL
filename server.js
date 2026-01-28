const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

let currentProcess = null;
let boreEnabled = false;

app.get('/api/status', (req, res) => {
    res.json({
        isStressing: currentProcess !== null,
        boreEnabled: boreEnabled
    });
});

app.post('/api/stress', (req, res) => {
    const { enabled, mode } = req.body;
    boreEnabled = mode === 'bore';

    if (currentProcess) {
        // Kill existing process if running
        exec('taskkill /F /IM wsl.exe'); // Generic kill for simplicity in demo
        currentProcess = null;
    }

    if (enabled) {
        // Run pseudocc in WSL
        // mode: 'normal' (standard priority) or 'bore' (simulated high priority for interactive)
        // We emulate BORE by renicing the process if mode is BORE
        const command = mode === 'bore'
            ? `wsl -e bash -c "cd /mnt/c/Users/asus/bore-scheduler && nice -n -10 ./tests/pseudocc 1000000000"`
            : `wsl -e bash -c "cd /mnt/c/Users/asus/bore-scheduler && nice -n 19 ./tests/pseudocc 1000000000"`;

        console.log(`Executing: ${command}`);
        currentProcess = exec(command);

        currentProcess.stdout.on('data', (data) => console.log(`stdout: ${data}`));
        currentProcess.stderr.on('data', (data) => console.error(`stderr: ${data}`));
    }

    res.json({ status: 'ok', enabled, mode });
});

app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
});
