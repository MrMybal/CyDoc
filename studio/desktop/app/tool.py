"""CyMCPSDK native CLI/MCP; JSON results on stdout, diagnostics on stderr."""
import argparse
import json
from pathlib import Path
import sys
from host import NativeHost


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, required=True)
    commands = parser.add_subparsers(dest='command', required=True)
    for name in ('mcp', 'serve', 'list'):
        commands.add_parser(name)
    describe = commands.add_parser('describe')
    describe.add_argument('operation', nargs='?')
    call = commands.add_parser('call')
    call.add_argument('operation')
    call.add_argument('--json', default='{}')
    args = parser.parse_args()
    with NativeHost(args.data_dir) as host:
        arguments = {'mcp': ['--stdio'], 'serve': [], 'list': ['--list']}.get(args.command)
        if args.command == 'describe':
            arguments = ['--describe', args.operation] if args.operation else ['--list']
        elif args.command == 'call':
            arguments = ['--call', args.operation, '--json', args.json]
        if args.command == 'serve':
            host.start()
            print(json.dumps(host.ready), flush=True)
            try:
                host.process.wait()
            except KeyboardInterrupt:
                pass
            return 0
        return host.run(arguments)


def run():
    try:
        return main()
    except Exception as error:
        print(json.dumps({'error': {'code': getattr(error, 'code', 'HostFailed'), 'message': str(error)}}), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(run())
