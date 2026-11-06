"""Frozen entry: desktop by default, real CyToolsCore CLI/MCP with --tool."""
import sys
if '--tool' in sys.argv:
    sys.argv.remove('--tool')
    from tool import create_runtime
    from cytools_core.transports.cli import run_cli
    raise SystemExit(run_cli(create_runtime))
else:
    from main import main
    try:
        main()
    except Exception as error:
        import logging
        import os
        logging.exception('CyDoc Studio could not start')
        if os.name=='nt' and '--exit-after' not in sys.argv:
            import ctypes
            ctypes.windll.user32.MessageBoxW(None,str(error),'CyDoc Studio',0x10)
        else:
            print(str(error),file=sys.stderr)
        raise SystemExit(1)
