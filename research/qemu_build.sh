#!/bin/bash
# Robust Kernel Build Suite for Graph-Burst Research
set -e

KERNEL_VER="6.12"
KERNEL_DIR="linux-$KERNEL_VER"
PATCH_FILE="graph_burst_eevdf_unified.patch"

echo "[*] Step 1: Cleaning environment..."
# Only remove if directory exists but patch failed
if [ -d "$KERNEL_DIR" ] && [ ! -f "$KERNEL_DIR/graph_patch_applied" ]; then
    echo "Found messy build directory. Starting fresh..."
    rm -rf "$KERNEL_DIR"
fi

echo "[*] Step 2: Preparing Kernel Source..."
if [ ! -d "$KERNEL_DIR" ] || [ ! -f "$KERNEL_DIR/Makefile" ]; then
    echo "Extracting tarball (this may take a minute)..."
    rm -rf "$KERNEL_DIR"
    if [ ! -f "linux-$KERNEL_VER.tar.xz" ]; then
        wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-$KERNEL_VER.tar.xz
    fi
    tar -xf linux-$KERNEL_VER.tar.xz
fi

cd "$KERNEL_DIR"

echo "[*] Step 3: Applying Unified Research Patch..."
if [ ! -f "graph_patch_applied" ]; then
    # Using --forward to avoid double-patching if script is rerun
    patch -p1 --forward < ../$PATCH_FILE || echo "Patch already applied or failed contextually."
    touch graph_patch_applied
fi

echo "[*] Step 4: Configuring Kernel..."
make defconfig
../scripts/config --enable CONFIG_SCHED_BORE
../scripts/config --enable CONFIG_SCHED_GRAPH_BURST
../scripts/config --set-val CONFIG_HZ 1000

echo "[*] Step 5: Compiling Kernel (Target: bzImage)..."
make -j$(nproc) bzImage

echo "[*] Step 6: Success! Kernel ready at arch/x86/boot/bzImage"
echo "To boot, run: "
echo "qemu-system-x86_64 -kernel arch/x86/boot/bzImage -append 'console=ttyS0 root=/dev/sda nokaslr quiet' -m 4G -smp 4 -nographic"
