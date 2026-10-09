import os
import tempfile
import unittest

from supervise import run


class Proc:
    def __init__(self, code):
        self.code = code

    def wait(self):
        return self.code


class SuperviseTest(unittest.TestCase):
    def test_restarts_until_stop_file(self):
        folder = tempfile.mkdtemp()
        stop = os.path.join(folder, "stop")
        codes = iter([1, 1, 0])

        def popen(_cmd):
            return Proc(next(codes))

        def sleep(_n):
            if not os.path.exists(stop):
                open(stop, "w").close()

        out = run(["feed"], popen, stop, sleep=sleep, pause_s=0)
        self.assertEqual(out["starts"], 1)
        self.assertEqual(out["codes"], [1])
        self.assertTrue(out["stopped"])

    def test_stops_before_the_first_start(self):
        folder = tempfile.mkdtemp()
        stop = os.path.join(folder, "stop")
        open(stop, "w").close()
        out = run(["feed"], lambda _c: Proc(0), stop, sleep=lambda _n: None)
        self.assertEqual(out["starts"], 0)
        self.assertTrue(out["stopped"])


if __name__ == "__main__":
    unittest.main()
