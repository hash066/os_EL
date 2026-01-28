const http = require('http');

const CLEAR = '\x1b[2J\x1b[H';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function draw(status) {
    process.stdout.write(CLEAR);

    // Header section (htop style)
    console.log(`${GREEN}1  [||||||||||||||||||||||||||||||||||||||| 98.2%]${RESET}`);
    console.log(`${GREEN}2  [||||                                     8.1%]${RESET}`);
    console.log(`${BLUE}Mem[|||||||||||||||||||||||||||||| 11.8G/27.1G]${RESET}`);
    console.log(`${CYAN}Swp[|                              79.7M/95.0G]${RESET}`);

    console.log(`\nTasks: 276, 272 kthr; 1 running`);
    console.log(`Load average: 1.45 0.85 0.42 `);
    console.log(`Uptime: 05:42:12\n`);

    // Table header
    console.log(`${BOLD}\x1b[7m PID USER      PRI  NI  SCORE  VIRT   RES   SHR S  CPU% MEM%   TIME+  Command         ${RESET}`);

    const apps = [
        { pid: 1087, user: 'root', pri: 20, ni: 0, score: 0, cpu: 0.5, mem: 1.2, name: 'systemd' },
        { pid: 3241, user: 'user', pri: 20, ni: 0, score: 0, cpu: 1.2, mem: 4.5, name: 'gnome-shell' },
        { pid: 5521, user: 'user', pri: 20, ni: 0, score: 0, cpu: 0.8, mem: 2.1, name: 'Xorg' },
        { pid: 7712, user: 'user', pri: 20, ni: 0, score: 0, cpu: 0.2, mem: 0.5, name: 'bash' },
    ];

    if (status.isStressing) {
        apps.unshift({
            pid: 9924,
            user: 'user',
            pri: status.boreEnabled ? 39 : 20,
            ni: status.boreEnabled ? 19 : 0,
            score: status.boreEnabled ? 15 : 2,
            cpu: status.boreEnabled ? 88.2 : 99.1,
            mem: 0.8,
            name: 'pseudocc'
        });
    }

    apps.forEach(app => {
        const line = `${app.pid.toString().padEnd(5)} ${app.user.padEnd(8)} ${app.pri.toString().padStart(3)} ${app.ni.toString().padStart(3)} ${app.score.toString().padStart(5)}   250M  120M  60M S  ${app.cpu.toFixed(1).padStart(4)}  ${app.mem.toFixed(1).padStart(3)}  0:42.12 ${app.name}`;
        if (app.name === 'pseudocc') {
            console.log(`${status.boreEnabled ? RED : CYAN}${BOLD}${line}${RESET}`);
        } else {
            console.log(line);
        }
    });

    console.log(`\n${status.boreEnabled ? GREEN + BOLD + 'BORE ENGINE: ACTIVE (Priority Bias: High)' : RED + BOLD + 'BORE ENGINE: DISABLED (Standard CFS Fairness)'}${RESET}`);
    console.log(`${status.isStressing ? YELLOW + BOLD + 'KERNEL LOAD: CRITICAL (pseudocc active)' : GREEN + 'KERNEL LOAD: IDLE'}${RESET}`);
}

const YELLOW = '\x1b[33m';

function update() {
    http.get('http://localhost:3001/api/status', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                draw(JSON.parse(data));
            } catch (e) {
                draw({ isStressing: false, boreEnabled: false });
            }
        });
    }).on('error', () => {
        draw({ isStressing: false, boreEnabled: false });
    });
}

setInterval(update, 500);
update();
console.log('Monitor started. Waiting for backend...');
