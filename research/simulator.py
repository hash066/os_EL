import random
import math

class Task:
    def __init__(self, name, priority, load, burst_char):
        self.name = name
        self.priority = priority # 0-39
        self.load = load # weight
        self.burst_char = burst_char # 'interactive', 'batch', 'gaming'
        self.vruntime = 0
        self.burst_time = 0
        self.burst_pred = 2.0
        self.latencies = []
        self.processed = 0

def simulate_scheduler(mode="cfs"):
    scenarios = [
        {"name": "Interactive (Editor/Code)", "tasks": [
            ("Editor", 20, 1024, 'interactive'),
            ("Background-Math", 30, 4096, 'batch')
        ]},
        {"name": "Gaming (Low-Latency)", "tasks": [
            ("Game-Renderer", 15, 2048, 'gaming'),
            ("File-Indexer", 25, 1024, 'batch')
        ]},
        {"name": "Mixed (Media/Worker)", "tasks": [
            ("Video-Stream", 10, 1024, 'interactive'),
            ("Worker-Pool", 35, 512, 'batch'),
            ("System-Daemon", 20, 1024, 'interactive')
        ]},
    ]
    
    results = []
    
    for scen_data in scenarios:
        # Re-initialize tasks for each scenario
        tasks = [Task(*t) for t in scen_data['tasks']]
        n_steps = 2000
        
        for _ in range(n_steps):
            # EEVDF selection logic (min vruntime)
            curr = min(tasks, key=lambda t: t.vruntime)
            
            # Simulated execution length
            if curr.burst_char == 'interactive':
                actual_exec = random.uniform(0.5, 3.0)
            elif curr.burst_char == 'gaming':
                actual_exec = random.uniform(1.0, 5.0)
            else:
                actual_exec = random.uniform(10.0, 20.0)
                
            # Mode Specific Logic (Graph-Burst)
            boost = 1.0
            if mode == "graph_burst":
                sibling_load = sum(t.load for t in tasks if t != curr)
                dep_weight = (curr.load * 1024) / (1 + sibling_load)
                
                # EWMA burst prediction
                curr.burst_pred = (curr.burst_pred * 0.8) + (actual_exec * 0.2)
                
                # Graph-Burst Boost Logic
                # MWIS Priority * Load / Neighbours
                graph_factor = dep_weight / 512.0
                burst_factor = 1.0 + (1.0 / max(0.1, curr.burst_pred))
                boost = graph_factor * burst_factor
                boost = max(1.0, min(4.5, boost))

            # Virtual time advancement
            increment = actual_exec * (1024.0 / curr.load)
            curr.vruntime += increment / boost
            
            curr.processed += actual_exec
            curr.latencies.append(actual_exec)

        # Aggregate Result Metrics
        all_latsSorted = sorted([l for t in tasks for l in t.latencies])
        p99_lat = all_latsSorted[int(len(all_latsSorted) * 0.99)] if all_latsSorted else 0
        
        proc_counts = [t.processed for t in tasks]
        total_throughput = sum(proc_counts)
        jains_top = sum(proc_counts)**2
        jains_bot = len(proc_counts) * sum(p**2 for p in proc_counts)
        jains_idx = jains_top / jains_bot if jains_bot != 0 else 0
        
        results.append({
            "scen": scen_data['name'],
            "mode": mode,
            "p99": p99_lat,
            "thr": total_throughput,
            "jain": jains_idx
        })
    return results

# Run Comparision
cfs = simulate_scheduler("cfs")
graph_burst = simulate_scheduler("graph_burst")

# Terminal Output
print(f"{'Scenario':<25} | {'Mode':<12} | {'99p Latency':<12} | {'Throughput':<12} | Jain's Index")
print("-" * 85)

for i in range(len(cfs)):
    c = cfs[i]
    g = graph_burst[i]
    print(f"{c['scen']:<25} | {'EEVDF(CFS)':<12} | {c['p99']:<10.2f}ms | {c['thr']:<10.0f}u | {c['jain']:.4f}")
    print(f"{'':<25} | {'GRAPH-BURST':<12} | {g['p99']:<10.2f}ms | {g['thr']:<10.0f}u | {g['jain']:.4f}")
    print("-" * 85)

# LaTeX Generation for Paper
print("\n\\begin{table}[h]")
print("\\centering")
print("\\caption{Comparison of Graph-Burst EEVDF vs. Baseline EEVDF/CFS}")
print("\\begin{tabular}{|l|c|c|c|r|}")
print("\\hline")
print("Scenario & Mode & 99p Latency & Jain's Index \\\\")
print("\\hline")
for i in range(len(cfs)):
    c = cfs[i]; g = graph_burst[i]
    print(f"{c['scen']} & EEVDF & {c['p99']:.2f}ms & {c['jain']:.4f} \\\\")
    print(f"{c['scen']} & \\textbf{{Proposed}} & \\textbf{{{g['p99']:.2f}ms}} & {g['jain']:.4f} \\\\")
    print("\\hline")
print("\\end{tabular}")
print("\\end{table}")
