---

## 9. Mathematical Foundations of Graph-Burst Scheduling

### 9.1 The Maximum Weight Independent Set (MWIS) Problem
The core of our topology awareness is based on the MWIS problem. In a graph $G = (V, E)$, an independent set is a subset of vertices where no two vertices are adjacent. The MWIS problem seeks the independent set with the maximum total weight.

In the context of the Linux cgroup tree:
1.  **Vertices ($V$)**: Represent the scheduled entities (tasks or task groups).
2.  **Edges ($E$)**: Represent the shared resource dependencies (e.g., sharing the same parent cgroup).
3.  **Weights ($W$)**: Represent the interactive priority assigned to the task.

### 9.2 The Local-Greedy Approximation
Finding the exact MWIS is NP-hard. However, our scheduler requires a decision in nanoseconds. We use a **Local-Greedy** heuristic:
$$\text{Weight}_i = \frac{W_i}{1 + \sum_{j \in \text{Neighbors}(i)} W_j}$$

This formula ensures that a task's priority is inversely proportional to the load of its siblings. This prevents "group crowding" where a cluster of high-priority tasks (like a parallel build) accidentally starves the rest of the system.

---

## 10. Deep Code Analysis: The Graph-Burst Patch

In this section, we analyze the critical modifications made to the Linux kernel to support Graph-Burst EEVDF.

### 10.1 Kernel Entity Modification (`sched.h`)
We extended the `sched_entity` structure to hold the historical state required for EWMA (Exponentially Weighted Moving Average) calculations.

```c
struct sched_entity {
    /* ... existing EEVDF fields ... */
    u64 burst_pred;      /* EWMA predicted burst length */
    u64 dep_weight;      /* Result of Local-Greedy MWIS */
    u32 graph_boost;     /* Final computed deadline multiplier */
};
```

### 10.2 The Core Algorithm Implementation (`fair.c`)
The most significant logic resides in the `update_graph_dep_weight` function. This function is called every time a task's virtual runtime is updated.

```c
static void update_graph_dep_weight(struct sched_entity *se) {
    struct sched_entity *parent = se->parent;
    u64 sibling_load = 0;

    /* Step 1: Accumulate load of all siblings in the same task group */
    if (parent && parent->my_q) {
        sibling_load = parent->my_q->avg_load;
    }

    /* Step 2: Compute the MWIS weight (Local-Greedy) */
    se->dep_weight = (se->load.weight << 10) / (1 + sibling_load);
    
    /* Step 3: Update EWMA for burst prediction (Smoothing factor alpha = 0.25) */
    se->burst_pred = (se->burst_pred * 3 + se->burst_time) >> 2;

    /* Step 4: Finalize the boost based on both temporal and spatial metrics */
    se->graph_boost = (u32)(se->dep_weight * (1 + (se->burst_pred >> 20)));
}
```

---

## 11. Data Pipeline Visualization

The following diagram provides a comprehensive view of the lifecycle of a request from the user's browser, through the custom scheduler, and back to the performance dashboard.

```mermaid
graph LR
    subgraph "User Space"
        A[React Dashboard] -- "HTTP POST" --> B[Node.js API]
        B -- "WSL CLI" --> C[Stress Test (pseudocc)]
        M[CLI Monitor] -- "HTTP GET" --> B
    end

    subgraph "Kernel Space"
        C -- "System Call" --> D[EEVDF Scheduler]
        D -- "BORE Calculation" --> E{Burst Engine}
        E -- "Low Burst" --> F[Apply Graph Boost]
        E -- "High Burst" --> G[Apply Penalty]
        F --> H[vruntime Update]
        G --> H
    end

    H -- "Task List" --> M
```
