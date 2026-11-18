#!/usr/bin/env python3
"""Hold an exclusive flock on argv[1] until the parent exits.

Writes the line `held` after the lock is taken so the shell can see it.
A second holder exits 1. The lock drops when this process exits.
"""
import fcntl
import os
import sys
import time

path = sys.argv[1]
fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o600)
try:
    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
except OSError:
    sys.exit(1)
os.ftruncate(fd, 0)
os.write(fd, b"held\n")
os.fsync(fd)
parent = os.getppid()
while True:
    time.sleep(0.2)
    try:
        os.kill(parent, 0)
    except OSError:
        break
    if os.getppid() != parent:
        break
