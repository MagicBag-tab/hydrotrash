"""Read-only WEAP COM bridge for HydroTrash.

Uses only documented read APIs: ProgramStarted, ActiveArea, Areas, Scenarios,
Branches and ResultValue. It never assigns model data, calculates, saves or
changes the active scenario/area.
"""
from __future__ import annotations
import argparse, csv, json, sys, time
from datetime import date
from pathlib import Path
from urllib.request import Request, urlopen

CONTRACT = ["elementCode", "periodStart", "periodEnd", "variable", "value", "unit"]

def fail(message):
    raise RuntimeError(message)

def connect(timeout):
    try:
        import win32com.client
        try:
            app = win32com.client.GetActiveObject("WEAP.WEAPApplication")
        except Exception:
            app = win32com.client.Dispatch("WEAP.WEAPApplication")
    except ImportError:
        fail("pywin32 no está instalado. Ejecute: py -m pip install -r weap-bridge\\requirements.txt")
    except Exception as exc:
        fail("No se pudo iniciar/conectar con WEAP.WEAPApplication. Verifique instalación, licencia y registro COM. Detalle: %s" % exc)
    deadline = time.monotonic() + timeout
    while not bool(app.ProgramStarted):
        if time.monotonic() >= deadline:
            fail("WEAP no indicó ProgramStarted dentro del tiempo máximo (%ss)." % timeout)
        time.sleep(.25)
    return app

def items(collection):
    try:
        return [collection[i] for i in range(1, int(collection.Count) + 1)]
    except Exception:
        return list(collection)

def name_of(obj):
    return str(getattr(obj, "Name", obj))

def branch_tree(branch, output):
    output.append(str(getattr(branch, "FullName", name_of(branch))))
    try:
        for child in items(branch.Children):
            branch_tree(child, output)
    except Exception:
        pass

def select_area(app, configured):
    if not configured:
        fail("Debe configurar 'area' explícitamente; no se infiere desde el nombre del archivo .WEAP.")
    matches = [a for a in items(app.Areas) if name_of(a).lower() == configured.lower()]
    if not matches:
        available = ", ".join(name_of(a) for a in items(app.Areas))
        fail("El área '%s' no está disponible en WEAP. Áreas visibles: %s" % (configured, available or "(ninguna)"))
    # Read-only: verify the active area, but do not assign ActiveArea.
    active = app.ActiveArea
    if name_of(active).lower() != configured.lower():
        fail("El área configurada existe pero no está activa ('%s'). Ábrala en WEAP y vuelva a ejecutar; el puente no cambia el área." % name_of(active))
    return active

def diagnostic(config, timeout):
    app = connect(timeout)
    area = select_area(app, config.get("area"))
    print("COM: OK; WEAP iniciado: %s" % bool(app.ProgramStarted))
    print("Área activa: %s" % name_of(area))
    print("Escenarios:")
    for scenario in items(app.Scenarios): print("  - %s" % name_of(scenario))
    print("Ramas:")
    branches = []
    for branch in items(app.Branches): branch_tree(branch, branches)
    for path in branches: print("  - %s" % path)

def period_bounds(year, timestep, start_month):
    if not 1 <= start_month <= 12 or timestep < 1: fail("waterYearStartMonth/timestep inválido")
    start_index = start_month - 1 + timestep - 1
    y, m = year + start_index // 12, start_index % 12 + 1
    start = date(y, m, 1)
    if m == 12: end = date(y + 1, 1, 1)
    else: end = date(y, m + 1, 1)
    return start.isoformat(), end.isoformat()

def extract_one(config, timeout):
    mappings = config.get("mappings", [])
    if len(mappings) != 1: fail("La extracción de este incremento requiere exactamente un mapping")
    mapping = mappings[0]
    app = connect(timeout); select_area(app, config.get("area"))
    scenario = str(config.get("scenario", ""));
    if not any(name_of(s).lower() == scenario.lower() for s in items(app.Scenarios)):
        fail("Escenario no encontrado: %s" % scenario)
    branch_path, variable, unit = mapping["branchPath"], mapping["variable"], mapping["unit"]
    try: branch = app.Branch(branch_path)
    except Exception as exc: fail("Rama no encontrada: %s (%s)" % (branch_path, exc))
    try:
        if not bool(branch.VariableExists(variable)): fail("Variable no encontrada en la rama: %s" % variable)
    except Exception: pass
    year, timestep = int(mapping["periodStartYear"]), int(mapping["timestep"])
    # WEAP documents ResultValue(branch:variable[unit], year, timestep, scenario).
    expression = "%s:%s[%s]" % (branch_path, variable, unit)
    try: value = app.ResultValue(expression, year, timestep, scenario)
    except Exception as exc: fail("WEAP no pudo leer ResultValue para %s, %s, timestep %s: %s" % (expression, scenario, timestep, exc))
    missing = value is None or str(value).strip() == ""
    start, end = period_bounds(year, timestep, int(config.get("waterYearStartMonth", 1)))
    return {"elementCode": mapping["hydrotrashCode"], "periodStart": start, "periodEnd": end, "variable": variable, "value": None if missing else float(value), "unit": unit, "scenario": scenario, "branchPath": branch_path, "provenance": "weap-com-readonly"}

def write_csv(row, output):
    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CONTRACT); writer.writeheader(); writer.writerow({k: "" if row[k] is None else row[k] for k in CONTRACT})

def extract_series(config, timeout):
    mappings = config.get("mappings", [])
    if not mappings: fail("Debe configurar al menos un mapping")
    count = int(config.get("periodCount", 12))
    if count < 1 or count > 12: fail("periodCount debe estar entre 1 y 12")
    app = connect(timeout); select_area(app, config.get("area"))
    scenario = str(config.get("scenario", ""))
    if not any(name_of(s).lower() == scenario.lower() for s in items(app.Scenarios)):
        fail("Escenario no encontrado: %s" % scenario)
    rows = []
    for mapping in mappings:
        branch_path, variable, unit = mapping["branchPath"], mapping["variable"], mapping["unit"]
        try: branch = app.Branch(branch_path)
        except Exception as exc: fail("Rama no encontrada: %s (%s)" % (branch_path, exc))
        try:
            if not bool(branch.VariableExists(variable)): fail("Variable no encontrada en la rama: %s" % variable)
        except Exception: pass
        year = int(mapping["periodStartYear"])
        for timestep in range(1, count + 1):
            expression = "%s:%s[%s]" % (branch_path, variable, unit)
            try: value = app.ResultValue(expression, year, timestep, scenario)
            except Exception as exc: fail("WEAP no pudo leer ResultValue para %s, %s, timestep %s: %s" % (expression, scenario, timestep, exc))
            month = timestep
            start = date(year, month, 1)
            end = date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)
            rows.append({"elementCode": mapping["hydrotrashCode"], "periodStart": start.isoformat(), "periodEnd": end.isoformat(), "variable": variable, "value": None if value is None else float(value), "unit": unit})
    return rows

def write_rows(rows, output):
    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CONTRACT); writer.writeheader(); writer.writerows(rows)

def import_csv(config, csv_path):
    url = config.get("backendUrl", "http://localhost:3000").rstrip("/") + "/api/weap/import"
    data = Path(csv_path).read_bytes()
    boundary = "----HydroTrashWEAPBridge"
    body = b"--" + boundary.encode() + b"\r\nContent-Disposition: form-data; name=\"scenario\"\r\n\r\n" + str(config["scenario"]).encode() + b"\r\n"
    body += b"--" + boundary.encode() + b"\r\nContent-Disposition: form-data; name=\"modelVersion\"\r\n\r\nCOM-readonly\r\n"
    body += b"--" + boundary.encode() + b"\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + Path(csv_path).name.encode() + b"\"\r\nContent-Type: text/csv\r\n\r\n" + data + b"\r\n--" + boundary.encode() + b"--\r\n"
    req = Request(url, data=body, headers={"Content-Type": "multipart/form-data; boundary=" + boundary}, method="POST")
    with urlopen(req, timeout=30) as response: print(response.read().decode("utf-8"))

def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--config", default="weap-bridge/config.json"); parser.add_argument("--timeout", type=int, default=60)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("diagnose")
    extract = sub.add_parser("extract-one"); extract.add_argument("--output", required=True)
    series = sub.add_parser("extract-series"); series.add_argument("--output", required=True)
    imp = sub.add_parser("import"); imp.add_argument("csv")
    args = parser.parse_args()
    try:
        config = json.loads(Path(args.config).read_text(encoding="utf-8"))
        if args.command == "diagnose": diagnostic(config, args.timeout)
        elif args.command == "extract-one":
            row = extract_one(config, args.timeout); write_csv(row, args.output); print(json.dumps(row, ensure_ascii=False))
        elif args.command == "extract-series":
            rows = extract_series(config, args.timeout); write_rows(rows, args.output); print(json.dumps({"count": len(rows), "output": args.output}, ensure_ascii=False))
        else: import_csv(config, args.csv)
    except Exception as exc:
        print("ERROR: %s" % exc, file=sys.stderr); return 2
    return 0

if __name__ == "__main__": sys.exit(main())
