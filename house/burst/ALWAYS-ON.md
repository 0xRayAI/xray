# Always on

`run` in `supervise.py` starts a feed command and starts it again when that process exits. Create the stop-file path to end the loop. Tests pass a fake `popen` and a fake `sleep`. A house shell can call the same function under `setsid` so the loop outlives the terminal that launched it.
