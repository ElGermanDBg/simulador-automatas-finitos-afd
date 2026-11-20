"""
=============================================================================
        SERVIDOR WEB OFICIAL - SIMULADOR DE AUTÓMATAS FINITOS (AFD)
=============================================================================
Asignatura: Estructuras Discretas
Descripción:
    Puente HTTP local (biblioteca estándar de Python) que sirve la interfaz
    web `frontend/` y delega toda la lógica formal de los Módulos 1, 2 y 3
    a la clase `Automata` de `src/simulador_afd.py`.

Ejecución:
    python src/servidor_web.py
=============================================================================
"""

import json
import mimetypes
import os
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

# Asegurar que src/ esté en sys.path tanto al ejecutar directamente como al importar
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from simulador_afd import Automata  # noqa: E402

FRONTEND_DIR = os.path.abspath(os.path.join(SRC_DIR, "..", "frontend"))


class SimuladorHandler(BaseHTTPRequestHandler):
    """Manejador HTTP que sirve `frontend/` y expone los endpoints del AFD."""

    def log_message(self, format, *args):
        # Evita ruido en consola; los errores importantes se imprimen aparte
        pass

    def _enviar_json(self, datos: dict, status: int = 200) -> None:
        cuerpo = json.dumps(datos, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(cuerpo)

    def _servir_archivo_estatico(self, rel_path: str) -> None:
        if rel_path in ("", "/"):
            rel_path = "index.html"
        rel_path = rel_path.lstrip("/")
        destino = os.path.abspath(os.path.join(FRONTEND_DIR, rel_path))

        # Protección contra path traversal
        try:
            en_frontend = os.path.commonpath([FRONTEND_DIR, destino]) == FRONTEND_DIR
        except ValueError:
            en_frontend = False

        if not en_frontend or not os.path.isfile(destino):
            self.send_error(404, "Archivo no encontrado")
            return

        mime_type, _ = mimetypes.guess_type(destino)
        if not mime_type:
            mime_type = "application/octet-stream"
        if mime_type.startswith("text/") or mime_type in ("application/javascript", "application/json"):
            mime_type = f"{mime_type}; charset=utf-8"

        with open(destino, "rb") as f:
            contenido = f.read()

        self.send_response(200)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Length", str(len(contenido)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(contenido)

    def _leer_json_body(self) -> dict | None:
        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            length = 0
        raw = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            self._enviar_json({"ok": False, "error": "Cuerpo JSON inválido."}, 400)
            return None
        if not isinstance(data, dict):
            self._enviar_json({"ok": False, "error": "El JSON debe ser un objeto."}, 400)
            return None
        return data

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        ruta = parsed.path

        if ruta == "/api/status":
            afd = self.server.automata_actual
            self._enviar_json({
                "ok": True,
                "motor": "python",
                "tiene_automata": afd is not None,
                "automata": afd.to_dict() if afd is not None else None,
            })
            return

        if ruta == "/api/modulo2":
            afd = self.server.automata_actual
            if afd is None:
                self._enviar_json(
                    {"ok": False, "error": "Primero debes construir un autómata en el Módulo 1."},
                    400,
                )
                return

            qs = parse_qs(parsed.query)
            try:
                cantidad = max(1, min(50, int(qs.get("cantidad", ["5"])[0])))
                max_len = max(0, min(12, int(qs.get("max_longitud", ["10"])[0])))
            except ValueError:
                cantidad, max_len = 5, 10

            palabras = afd.generar_palabras_reconocidas(max_palabras=cantidad, max_longitud=max_len)
            n = len(palabras)
            if n == 0:
                mensaje = f"Este autómata no reconoce ninguna palabra de longitud menor o igual que {max_len}."
                if not afd.F:
                    mensaje += " (El conjunto de estados finales F está vacío)."
            elif n < cantidad:
                lbl = "palabra" if n == 1 else "palabras"
                mensaje = f"Este autómata solo reconoce {n} {lbl} de longitud menor o igual que {max_len}."
            else:
                mensaje = ""

            self._enviar_json({
                "ok": True,
                "tupla_str": afd.obtener_5_tupla_str(),
                "palabras": palabras,
                "mensaje": mensaje,
                "max_longitud": max_len,
            })
            return

        self._servir_archivo_estatico(ruta)

    def do_POST(self) -> None:
        ruta = urlparse(self.path).path
        data = self._leer_json_body()
        if data is None:
            return

        if ruta == "/api/automata":
            try:
                afd, advertencias = Automata.from_dict(data)
            except ValueError as err:
                self._enviar_json({"ok": False, "error": str(err)}, 400)
                return

            self.server.automata_actual = afd
            self._enviar_json({
                "ok": True,
                "automata": afd.to_dict(),
                "advertencias": advertencias,
            })
            return

        if ruta == "/api/modulo3":
            afd = self.server.automata_actual
            if afd is None:
                self._enviar_json(
                    {"ok": False, "error": "Primero debes construir un autómata en el Módulo 1."},
                    400,
                )
                return

            cadena = data.get("cadena", "")
            if not isinstance(cadena, str):
                cadena = str(cadena)

            resultado = afd.evaluar_cadena(cadena)
            self._enviar_json({
                "ok": True,
                **resultado,
                "Sigma": list(afd.Sigma),
                "F": list(afd.F),
            })
            return

        self._enviar_json({"ok": False, "error": "Endpoint no encontrado."}, 404)

    def do_DELETE(self) -> None:
        ruta = urlparse(self.path).path
        if ruta == "/api/automata":
            self.server.automata_actual = None
            self._enviar_json({"ok": True})
            return
        self._enviar_json({"ok": False, "error": "Endpoint no encontrado."}, 404)


def crear_servidor(host: str = "127.0.0.1", port: int = 8000) -> ThreadingHTTPServer:
    """Crea una instancia del servidor HTTP con estado en memoria aislado."""
    server = ThreadingHTTPServer((host, port), SimuladorHandler)
    server.automata_actual = None
    return server


def main() -> None:
    """Inicia el servidor web local y abre el simulador en el navegador."""
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    servidor = crear_servidor("127.0.0.1", 8000)
    url = "http://127.0.0.1:8000"

    print("=" * 66)
    print("   SIMULADOR DE AUTÓMATAS FINITOS (AFD) · SERVIDOR WEB")
    print("=" * 66)
    print(f" [+] Interfaz web disponible en: {url}")
    print(" [+] Motor lógico oficial      : src/simulador_afd.py (Automata)")
    print(" [i] Presiona Ctrl+C en esta ventana para detener el servidor.")
    print("=" * 66)

    threading.Timer(0.5, lambda: webbrowser.open(url)).start()

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\n[i] Servidor detenido correctamente.")
        servidor.server_close()


if __name__ == "__main__":
    main()
