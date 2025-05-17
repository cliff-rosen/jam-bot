import sys
import time

print("Testing basic print")
print("Testing stderr", file=sys.stderr)

for i in range(3):
    print(f"Print {i}", flush=True)
    time.sleep(1) 