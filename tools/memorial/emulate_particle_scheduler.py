"""Execute bounded original Particle generator scheduling, without rendering.

The request-only mode intercepts activation. The initialized mode executes the
original callback/PostUpdate with neutral parent helpers and optional ConstX/VelocityX.
Inputs and deltas are controlled fixtures, not complete native traversal replay.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct

from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UC_HOOK_CODE, UC_PROT_READ, UC_PROT_EXEC
from unicorn.arm64_const import UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_W3, UC_ARM64_REG_LR, UC_ARM64_REG_SP, UC_ARM64_REG_PC, UC_ARM64_REG_CPACR_EL1
from emulate_zscreen_locator import LocatorReference, HEAP, STACK, STOP
from prepare_diagnostic import EXPECTED_NATIVE

FUNCTIONS = {'activate': (0x1fee474, 488), 'update': (0x1fefea4, 1436)}
PHASE_FUNCTIONS = {'callback': (0x1fefae4, 956), 'post': (0x1fef2f8, 1908),
                   'expired': (0x1fef234, 196)}
SCALE_FUNCTIONS = {'scaleInitWrapper': (0x2001fe8, 16), 'scaleInit': (0x1fc75ec, 116),
                   'scaleInitVector': (0x1fc7660, 12),
                   'scaleUpdateWrapper': (0x1fc7a54, 4), 'scaleUpdate': (0x1fc7a30, 36)}
VELOCITY_FUNCTIONS = {'scaleInitWrapper': (0x2001ff8, 24), 'scaleInit': (0x1fc766c, 168),
                      'scaleInitVector': (0x1fc7714, 20),
                      'scaleUpdateWrapper': (0x1fc7a9c, 4), 'scaleUpdate': (0x1fc7a58, 68)}
CALLBACK = 0x11328a0
EXPIRED_PLT = 0x10e1060
SCALE_INIT_PLT = 0x10d8cd0
SCALE_SCALAR_PLT = 0x111ff30
SCALE_UPDATE_PLT = 0x10de4f0
SEED = (123456789, 362436069, 521288629, 88675123)


class ParticleSchedulerReference:
    def __init__(self, apk):
        self.image = LocatorReference(apk)
        self.identities = {name: {'address': hex(address), 'bytes': size,
            'sha256': hashlib.sha256(self.image.read(address, size)).hexdigest()}
            for name, (address, size) in (FUNCTIONS | PHASE_FUNCTIONS | SCALE_FUNCTIONS).items()}

    def run(self, start=0, start_range=0, count=1, duration=4, repeats=1,
            interval=1, restart=0, restart_range=0, steps=(1, 1, 1, 1, 1),
            rng=SEED, enabled=True, suspended=False, phase_mode='requests', life=10,
            life_range=0, capacity=128, scale_module=None, scale_value=1, scale_range=0,
            scale_velocity=0, scale_velocity_range=0):
        if phase_mode not in ('requests', 'initialized'):
            raise ValueError('Unknown phase mode')
        initialized = phase_mode == 'initialized'
        if scale_module not in (None, 'ConstX', 'VelocityX') or scale_module and not initialized:
            raise ValueError('Only initialized ConstX/VelocityX module chains are supported')
        if not all(math.isfinite(x) and abs(x) <= 10000 for x in (scale_value, scale_range, scale_velocity, scale_velocity_range)) or min(scale_range,scale_velocity_range) < 0:
            raise ValueError('Expected bounded scale fixtures')
        scale_functions = VELOCITY_FUNCTIONS if scale_module=='VelocityX' else SCALE_FUNCTIONS
        scale_plts = (0x10e48a0,0x110dc10,0x1114160) if scale_module=='VelocityX' else (SCALE_INIT_PLT,SCALE_SCALAR_PLT,SCALE_UPDATE_PLT)
        integers = (start, start_range, count, duration, repeats, restart, restart_range)
        if any(type(x) is not int or not 0 <= x <= 10000 for x in integers):
            raise ValueError('Expected bounded nonnegative integer generator fixtures')
        if min(count, duration, repeats) < 1:
            raise ValueError('Zero count/duration/repeats are outside this reference subset')
        if start and steps and not initialized:
            raise ValueError('Delayed generators require the separate PostUpdate phase; activation-only fixtures use steps=[]')
        if not math.isfinite(interval) or not .001 <= interval <= 10000:
            raise ValueError('Expected positive bounded interval')
        if len(steps) > 256 or any(not math.isfinite(x) or not 0 <= x <= 100 for x in steps):
            raise ValueError('Expected bounded nonnegative update deltas')
        if len(rng) != 4 or any(type(x) is not int or not 0 <= x <= 0xffffffff for x in rng) or not any(rng):
            raise ValueError('Expected nonzero four-word RNG fixture')
        if any(type(x) is not int or not 0 <= x <= 10000 for x in (life, life_range)) or type(capacity) is not int or not 1 <= capacity <= 128:
            raise ValueError('Expected bounded lifetime and ring capacity')
        cpu = Uc(UC_ARCH_ARM64, UC_MODE_ARM)
        functions = FUNCTIONS | (PHASE_FUNCTIONS if initialized else {})
        if scale_module:
            functions |= scale_functions
        pages = {page for address, size in functions.values()
                 for page in range(address & ~4095, ((address + size + 4 + 4095) & ~4095), 4096)}
        for page in pages:
            cpu.mem_map(page, 4096); cpu.mem_write(page, self.image.read(page, 4096))
            cpu.mem_protect(page, 4096, UC_PROT_READ | UC_PROT_EXEC)
        cpu.mem_map(CALLBACK & ~4095, 4096)
        if initialized:
            cpu.mem_map(EXPIRED_PLT & ~4095, 4096)
        if scale_module:
            for page in sorted({a&~4095 for a in scale_plts}):cpu.mem_map(page,4096)
        cpu.mem_map(HEAP, 65536); cpu.mem_map(STACK, 65536); cpu.mem_map(STOP, 4096)
        emitter, param, record, joint, context = (HEAP + i * 4096 for i in range(5))

        def write(address, fmt, *values):
            cpu.mem_write(address, struct.pack('<' + fmt, *values))

        def read(address, fmt):
            return struct.unpack('<' + fmt, cpu.mem_read(address, struct.calcsize('<' + fmt)))

        write(emitter + 0xf0, 'Q', param); write(emitter + 0x108, 'Q', record)
        write(emitter + 0x130, '4I', *rng); write(emitter + 0x140, 'I', 1)
        write(param + 0xd8, 'B', int(enabled)); write(param + 0xf0, '6I', start, start_range, life, life_range, 0, 0)
        write(param + 0x108, '5I', count, duration, repeats, restart, restart_range)
        write(param + 0x1a4, 'f', interval)
        write(joint + 0x60, '2I', 1, 1)
        write(context + 0x9c, 'B', int(suspended))
        if initialized:
            # Neutral parent-transform fixtures. These helpers do not render or
            # implement inherited geometry. Init/update module arrays are null.
            for offset, stub in ((8, STOP + 0x100), (0x10, STOP + 0x200), (0x18, STOP + 0x300)):
                write(emitter + offset, 'Q', stub)
            write(emitter + 0x110, 'Q', HEAP + 0x5000)
            write(emitter + 0x118, 'Q', HEAP + 0x7000)
            write(record + 0x38, 'I', capacity)
            for index in range(capacity):
                write(HEAP + 0x5000 + index * 32 + 0x18, 'Q', HEAP + 0x8000 + index * 32)
            # Explicit synthetic globals for non-rendering execution: stack
            # cookie, neutral vec4 and unused matrix pointer, not live values.
            for page in (0x2e0a000, 0x2e10000, 0x2e12000):
                cpu.mem_map(page, 4096)
            write(0x2e0ae08, 'Q', HEAP + 0xf000); write(HEAP + 0xf000, 'Q', 0x12345678)
            write(0x2e12cc8, 'Q', HEAP + 0xf100); write(HEAP + 0xf100, '4f', 0, 0, 0, 1)
            write(0x2e10650, 'Q', HEAP + 0xf200)
            if scale_module:
                for field, array, wrapper in ((0x28, HEAP + 0xd000, 'scaleInitWrapper'),
                                               (0x30, HEAP + 0xd100, 'scaleUpdateWrapper')):
                    write(emitter + field, 'Q', array); write(array, 'QI', array + 0x20, 1)
                    write(array + 0x20, 'Q', functions[wrapper][0])
                write(param + 0x30c, '3f', scale_value, 0, 0)
                write(param + 0x318, '3f', scale_range, 0, 0)
                write(param + 0x324, '3f', scale_velocity, 0, 0)
                write(param + 0x330, '3f', scale_velocity_range, 0, 0)
        cpu.reg_write(UC_ARM64_REG_CPACR_EL1, 3 << 20)
        requests, instructions = [], [0]
        current_step = [-1]; parent_calls = []; module_calls = []

        def execute(machine, address, size, _):
            instructions[0] += 1
            if address == CALLBACK:
                if machine.reg_read(UC_ARM64_REG_X0) != emitter or machine.reg_read(UC_ARM64_REG_X1) != record or machine.reg_read(UC_ARM64_REG_X2) != context:
                    raise ValueError('Unexpected callback ownership')
                requests.append({'step': current_step[0], 'offset': read(context + 8, 'f')[0],
                                 'count': machine.reg_read(UC_ARM64_REG_W3)})
                if len(requests) > 4096:
                    raise ValueError('Excessive callback requests')
                machine.reg_write(UC_ARM64_REG_PC, PHASE_FUNCTIONS['callback'][0] if initialized else machine.reg_read(UC_ARM64_REG_LR))
            elif initialized and address == EXPIRED_PLT:
                machine.reg_write(UC_ARM64_REG_PC, PHASE_FUNCTIONS['expired'][0])
            elif scale_module and address == scale_plts[0]:
                machine.reg_write(UC_ARM64_REG_PC, scale_functions['scaleInitVector'][0])
            elif scale_module and address == scale_plts[1]:
                machine.reg_write(UC_ARM64_REG_PC, scale_functions['scaleInit'][0])
            elif scale_module and address == scale_plts[2]:
                machine.reg_write(UC_ARM64_REG_PC, scale_functions['scaleUpdate'][0])
            elif initialized and address in (STOP + 0x100, STOP + 0x200, STOP + 0x300):
                parent_calls.append({'step': current_step[0], 'slot': (address - STOP) // 0x100})
                machine.reg_write(UC_ARM64_REG_PC, machine.reg_read(UC_ARM64_REG_LR))
            elif not any(a <= address < a + n for a, n in functions.values()):
                raise ValueError('Execution escaped the pinned scheduler')
            if scale_module and address in (scale_functions['scaleInitWrapper'][0], scale_functions['scaleUpdateWrapper'][0]):
                module_context = machine.reg_read(UC_ARM64_REG_X0)
                if read(module_context + 0x30, 'Q')[0] != emitter + 0x130:
                    raise ValueError('Module RNG does not belong to the generator emitter')
                stage = 'init' if address == scale_functions['scaleInitWrapper'][0] else 'update'
                module_calls.append({'step': current_step[0], 'stage': stage,
                    'emitterRng': list(read(emitter + 0x130, '4I')),
                    **({'delta': read(module_context + 0x40, 'f')[0]} if stage == 'update' else {})})

        cpu.hook_add(UC_HOOK_CODE, execute)

        def call(name, second):
            address, size = functions[name]
            cpu.reg_write(UC_ARM64_REG_X0, emitter); cpu.reg_write(UC_ARM64_REG_X1, second)
            cpu.reg_write(UC_ARM64_REG_LR, STOP); cpu.reg_write(UC_ARM64_REG_SP, STACK + 0xf000)
            cpu.emu_start(address, STOP, count=100000)
            if cpu.reg_read(UC_ARM64_REG_PC) != STOP:
                raise ValueError('Incomplete scheduler execution')

        def snapshot():
            words = read(record, '8i')
            return {'mode': words[0], 'durationTicks': words[1], 'intervalTicks': words[2],
                    'remainingTicks': words[3], 'emitted': words[4], 'cycleEmitted': words[5],
                    'limit': words[6], 'delayTicks': read(record + 0x28, 'i')[0],
                    'rng': list(read(emitter + 0x130, '4I'))}

        def particle_snapshot():
            return [{'slot': slot, 'lifeTicks': read(HEAP + 0x5000 + slot * 32, 'i')[0],
                     'ageTicks': read(HEAP + 0x5000 + slot * 32 + 4, 'i')[0],
                     'moduleRecord': list(read(HEAP + 0x8000 + slot * 32, '2f' if scale_module=='VelocityX' else 'f')) if scale_module else []}
                    for slot in range(min(capacity, read(record + 0x3c, 'I')[0]))]

        call('activate', joint)
        initial = snapshot(); updates = []
        if initial['delayTicks'] < 0 and steps and not initialized:
            raise ValueError('Randomized delay requires the separate PostUpdate phase; use activation-only steps=[]')
        for index, delta in enumerate(steps):
            current_step[0] = index; write(context + 8, 'f', delta)
            call('update', context)
            after_update = snapshot()
            if initialized:
                after_update['particles'] = particle_snapshot()
                call('post', context)
            row = {'delta': delta, 'restoredDelta': read(context + 8, 'f')[0], **snapshot()}
            if initialized:
                row.update(afterUpdate=after_update, expired=bool(read(emitter + 0x154, 'B')[0]),
                           particles=particle_snapshot())
            updates.append(row)
        return {'initial': initial, 'updates': updates, 'requests': requests,
                'instructions': instructions[0], 'phaseMode': phase_mode, 'parentFixtureCalls': parent_calls,
                'moduleCalls': module_calls,
                'callbackPolicy': ('Original callback and PostUpdate; neutral parent helper stubs, optional single scale module, controlled ring'
                                   if initialized else 'Record only; no initialization, capacity decision or callback RNG executed')}

    def source_cases(self, path, phase_mode='requests'):
        # Decode only the pinned Particle layout; no authoring supplement needed.
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        from inspect_bmb import read_bmb
        raw = path.read_bytes(); cases = []
        for node in read_bmb(raw)['nodes']:
            if node['typeId'] != 3:
                continue
            offset = node['offset']
            if struct.unpack_from('<I', raw, offset + 0x208)[0] or any(raw[offset + 0xdb:offset + 0xdd]):
                raise ValueError('Source uses generation mode/flags outside the controlled subset')
            start, spread = struct.unpack_from('<2I', raw, offset + 0xf0)
            values = struct.unpack_from('<5I', raw, offset + 0x108)
            inputs = dict(zip(('count', 'duration', 'repeats', 'restart', 'restart_range'), values))
            inputs.update(start=start, start_range=spread,
                          enabled=bool(raw[offset + 0xd8]),
                          interval=struct.unpack_from('<f', raw, offset + 0x1a4)[0],
                          steps=[] if start or spread else [1] * min(100, values[1] + 1))
            if phase_mode == 'initialized':
                life, life_range = struct.unpack_from('<2I', raw, offset + 0xf8)
                inputs.update(phase_mode=phase_mode, life=life, life_range=life_range,
                              steps=[1] * min(100, start + values[1] + life + 2))
                if struct.unpack_from('<I', raw, offset + 0x12c)[0] == 16:
                    inputs.update(scale_module='ConstX',
                                  scale_value=struct.unpack_from('<f', raw, offset + 0x30c)[0],
                                  scale_range=struct.unpack_from('<f', raw, offset + 0x318)[0])
            elif phase_mode != 'requests':
                raise ValueError('Unknown source phase mode')
            cases.append({'source': path.name, 'sourceSha256': hashlib.sha256(raw).hexdigest(),
                          'node': node['index'], 'inputs': inputs, 'result': self.run(**inputs),
                          'boundary': 'Source generation/lifetime and selected ConstX only; controlled joint/RNG/deltas, other modules omitted'})
        return cases


def fixture_cases(reference):
    inputs = [dict(), dict(interval=.5), dict(interval=1.5), dict(start=2, steps=[]),
              dict(start=2, start_range=5, steps=[]), dict(count=3), dict(repeats=2, restart=2),
              dict(steps=[.5] * 10), dict(steps=[5]), dict(steps=[0, 0, 1]),
              dict(enabled=False), dict(suspended=True), dict(duration=1)]
    return [{'inputs': value, 'result': reference.run(**value)} for value in inputs]


def initialized_cases(reference):
    inputs = [dict(), dict(start=2), dict(start=2, steps=[2.5, .5, 1]),
              dict(interval=.5), dict(count=3), dict(duration=1, life=1),
              dict(duration=1, life=0), dict(life=3, life_range=5),
              dict(duration=1, count=3, scale_module='ConstX', scale_value=10, scale_range=4)]
    return [{'inputs': {'phase_mode': 'initialized', **value},
             'result': reference.run(phase_mode='initialized', **value)} for value in inputs]


def bounded_cases(reference, family):
    if family == 'velocity-birth':
        inputs = [dict(interval=.5, steps=[1, 1], scale_value=2, scale_range=1, scale_velocity=-.1),
                  dict(duration=1, count=2, steps=[.25, .75, 2], scale_value=1, scale_velocity=-2),
                  dict(start=2, steps=[2.5, .5, 1], scale_value=-1, scale_velocity=3),
                  dict(count=1, duration=3, steps=[1, 1, 1], scale_value=2, scale_range=1,
                       scale_velocity=-.1, scale_velocity_range=.05)]
        inputs = [dict(scale_module='VelocityX', **value) for value in inputs]
    else:
        inputs = [dict(steps=[5]), dict(suspended=True), dict(enabled=False),
                  dict(duration=1, life=3, life_range=5, count=3, steps=[2.5, .5, 1]),
                  dict(interval=.5, steps=[.25, 1.5, .25, 2, 0]), dict(start=2, steps=[1, 1, 0, 0, 1]),
                  dict(duration=1, scale_module='ConstX', scale_value=-1, scale_range=0, steps=[1, 1])]
    return [dict(inputs=dict(phase_mode='initialized', **value),
                 result=reference.run(phase_mode='initialized', **value)) for value in inputs]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--family', choices=['existing', 'lifecycle-holdout', 'velocity-birth'], default='existing')
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must remain inside tools/data')
    reference = ParticleSchedulerReference(args.apk)
    if args.family != 'existing':
        functions = dict(reference.identities)
        if args.family == 'velocity-birth':
            functions.update({'velocity_' + name: dict(address=hex(address), bytes=size,
                sha256=hashlib.sha256(reference.image.read(address, size)).hexdigest())
                for name, (address, size) in VELOCITY_FUNCTIONS.items()})
        result = dict(approved=False, wholeEffectReconstructed=False, nativeSha256=EXPECTED_NATIVE,
                      functions=functions, cases=bounded_cases(reference, args.family),
                      boundary='Controlled single initializer and neutral parent; not a complete source effect')
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
        print(json.dumps(dict(family=args.family, cases=len(result['cases']))))
        raise SystemExit(0)
    cases = fixture_cases(reference)
    phases = initialized_cases(reference)
    corpus = Path('tools/data/shared-skill-review')
    source_cases = [case for folder in ('brave-slash-composed', 'blade-beam', 'climhazzard')
                    for path in (corpus / folder / 'originals').glob('*.bmb')
                    for case in reference.source_cases(path)]
    source_phases = [case for folder in ('brave-slash-composed', 'blade-beam', 'climhazzard')
                     for path in (corpus / folder / 'originals').glob('*.bmb')
                     for case in reference.source_cases(path, 'initialized')]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({'nativeSha256': EXPECTED_NATIVE, 'functions': reference.identities,
        'approved': False, 'cases': cases, 'sourceCases': source_cases,
        'initializedCases': phases, 'sourceInitializedCases': source_phases,
        'boundary': 'Controlled single-generator modes with optional ConstX; neutral parent helpers, other modules omitted, not full particle simulation'}, indent=2), encoding='utf-8')
    print(json.dumps({'cases': len(cases), 'sourceCases': len(source_cases),
                      'initializedCases': len(phases), 'sourceInitializedCases': len(source_phases),
                      'requests': sum(len(c['result']['requests']) for c in cases)}))
