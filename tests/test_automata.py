"""
Pruebas completas del Simulador de AFD (src/simulador_afd.py) y del
servidor web (src/servidor_web.py), cubriendo Tablas 1 y 2 del enunciado,
validaciones, JSON, Graphviz DOT y endpoints HTTP.

Ejecución desde la raíz del proyecto:
    python tests/test_automata.py
"""

import json
import os
import sys
import tempfile
import threading
import urllib.error
import urllib.request

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(ROOT_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from servidor_web import crear_servidor  # noqa: E402
from simulador_afd import Automata  # noqa: E402

A1 = Automata(
    ["q0", "q1"],
    ["0", "1"],
    {("q0", "0"): "q1", ("q0", "1"): "q0", ("q1", "0"): "q0", ("q1", "1"): "q1"},
    "q0",
    ["q0"],
)
A2 = Automata(
    ["s0", "s1", "s2"],
    ["a", "b"],
    {
        ("s0", "a"): "s1",
        ("s0", "b"): "s0",
        ("s1", "a"): "s1",
        ("s1", "b"): "s2",
        ("s2", "a"): "s1",
        ("s2", "b"): "s0",
    },
    "s0",
    ["s2"],
)
A3 = Automata(
    ["p0", "p1", "p2", "p3", "m"],
    ["a", "b"],
    {
        ("p0", "a"): "p1",
        ("p0", "b"): "p2",
        ("p1", "a"): "m",
        ("p1", "b"): "p3",
        ("p2", "a"): "p3",
        ("p2", "b"): "m",
        ("p3", "a"): "m",
        ("p3", "b"): "m",
        ("m", "a"): "m",
        ("m", "b"): "m",
    },
    "p0",
    ["p3"],
)
A4 = Automata(
    ["q0", "q1"],
    ["a"],
    {("q0", "a"): "q0", ("q1", "a"): "q1"},
    "q0",
    ["q1"],
)


def test_tabla_1_y_recorridos():
    res_a1 = A1.generar_palabras_reconocidas(5, 10)
    assert [p["palabra_repr"] for p in res_a1] == ["ε", "1", "00", "11", "001"]
    assert res_a1[0]["recorrido_str"] == "q0"

    res_a2 = A2.generar_palabras_reconocidas(5, 10)
    assert [p["palabra_repr"] for p in res_a2] == ["ab", "aab", "bab", "aaab", "abab"]
    assert res_a2[0]["recorrido_str"] == "s0 -a→ s1 -b→ s2"
    assert res_a2[2]["recorrido_str"] == "s0 -b→ s0 -a→ s1 -b→ s2"

    res_a3 = A3.generar_palabras_reconocidas(5, 10)
    assert [p["palabra_repr"] for p in res_a3] == ["ab", "ba"]

    res_a4 = A4.generar_palabras_reconocidas(5, 10)
    assert res_a4 == []


def test_tabla_2():
    casos = [
        (A2, "abab", True, "s0 -a→ s1 -b→ s2 -a→ s1 -b→ s2"),
        (A2, "aba", False, "s0 -a→ s1 -b→ s2 -a→ s1"),
        (A2, "bab", True, "s0 -b→ s0 -a→ s1 -b→ s2"),
        (A2, "bb", False, "s0 -b→ s0 -b→ s0"),
        (A2, "", False, "s0"),
        (A1, "0110", True, "q0 -0→ q1 -1→ q1 -1→ q1 -0→ q0"),
        (A1, "1011", False, "q0 -1→ q0 -0→ q1 -1→ q1 -1→ q1"),
        (A1, "", True, "q0"),
    ]
    for afd, palabra, esperado, recorrido in casos:
        r = afd.evaluar_cadena(palabra)
        assert r["aceptada"] is esperado, (palabra, r)
        assert r["recorrido_str"] == recorrido, (palabra, r["recorrido_str"])

    r_abc = A2.evaluar_cadena("abc")
    assert (r_abc["valida"], r_abc["aceptada"], r_abc["error_simbolo"], r_abc["error_posicion"]) == (False, False, "c", 3)

    r_sp = A2.evaluar_cadena("a b")
    assert (r_sp["valida"], r_sp["error_simbolo"], r_sp["error_posicion"]) == (False, " ", 2)


def test_validaciones_y_json():
    # Duplicado en Q
    err_q, _ = Automata.validar_definicion(["q0", "q0"], ["a"], {}, "q0", [])
    assert err_q

    # Símbolo > 1 carácter en Sigma
    err_s, _ = Automata.validar_definicion(["q0"], ["ab"], {("q0", "ab"): "q0"}, "q0", [])
    assert err_s

    # Destino fuera de Q
    err_d, _ = Automata.validar_definicion(["q0"], ["a"], {("q0", "a"): "q9"}, "q0", [])
    assert err_d

    # F vacío: permitido con advertencia
    err_f, adv_f = Automata.validar_definicion(["q0"], ["a"], {("q0", "a"): "q0"}, "q0", [])
    assert not err_f and len(adv_f) == 1

    # Guardar / Cargar JSON
    with tempfile.TemporaryDirectory() as tmp:
        ruta = os.path.join(tmp, "afd_a2.json")
        A2.guardar_json(ruta)
        cargado, adv = Automata.cargar_json(ruta)
        assert not adv
        assert cargado.Q == A2.Q and cargado.Sigma == A2.Sigma and cargado.delta == A2.delta


def test_graphviz_dot():
    with tempfile.TemporaryDirectory() as tmp:
        base = os.path.join(tmp, "grafo_test")
        afd_colon = Automata(
            ["q:0", "q:1"],
            ["a", "b"],
            {("q:0", "a"): "q:1", ("q:0", "b"): "q:1", ("q:1", "a"): "q:0", ("q:1", "b"): "q:0"},
            "q:0",
            ["q:1"],
        )
        afd_colon.graficar(nombre_archivo=base, abrir_visor=False)
        with open(f"{base}.gv", "r", encoding="utf-8") as f:
            dot = f.read()
        assert 'label="a, b"' in dot
        assert "shape=doublecircle" in dot
        assert "__inicio__ [shape=point style=invis]" in dot
        assert 'n0 [label="q:0" shape=circle]' in dot


def _http_req(url, method="GET", payload=None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if data is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        return err.code, err.read().decode("utf-8")


def test_servidor_web_http():
    srv = crear_servidor("127.0.0.1", 0)
    port = srv.server_address[1]
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    base = f"http://127.0.0.1:{port}"

    try:
        # Página principal HTML
        code, html = _http_req(f"{base}/")
        assert code == 200 and "Simulador de Autómatas Finitos" in html

        # Error controlado antes de definir autómata
        code, body = _http_req(f"{base}/api/modulo2")
        assert code == 400 and json.loads(body)["ok"] is False

        code, body = _http_req(f"{base}/api/modulo3", method="POST", payload={"cadena": "ab"})
        assert code == 400 and json.loads(body)["ok"] is False

        # Construir A4 (1 símbolo) y verificar Módulo 2
        code, body = _http_req(f"{base}/api/automata", method="POST", payload=A4.to_dict())
        assert code == 200
        code, body = _http_req(f"{base}/api/modulo2?cantidad=5&max_longitud=10")
        m2_a4 = json.loads(body)
        assert m2_a4["palabras"] == [] and "no reconoce ninguna palabra" in m2_a4["mensaje"]

        # Construir A3 (5 estados) y verificar mensaje de 2 palabras
        code, _ = _http_req(f"{base}/api/automata", method="POST", payload=A3.to_dict())
        assert code == 200
        code, body = _http_req(f"{base}/api/modulo2?cantidad=5&max_longitud=10")
        m2_a3 = json.loads(body)
        assert [p["palabra_repr"] for p in m2_a3["palabras"]] == ["ab", "ba"]
        assert "solo reconoce 2 palabras" in m2_a3["mensaje"]

        # Construir A2 y verificar Módulo 3
        code, _ = _http_req(f"{base}/api/automata", method="POST", payload=A2.to_dict())
        assert code == 200
        code, body = _http_req(f"{base}/api/modulo3", method="POST", payload={"cadena": "bab"})
        r_bab = json.loads(body)
        assert r_bab["aceptada"] is True and r_bab["recorrido_str"] == "s0 -b→ s0 -a→ s1 -b→ s2"

        code, body = _http_req(f"{base}/api/modulo3", method="POST", payload={"cadena": "abc"})
        r_abc = json.loads(body)
        assert r_abc["valida"] is False and r_abc["error_simbolo"] == "c" and r_abc["error_posicion"] == 3

        # DELETE reinicia
        code, _ = _http_req(f"{base}/api/automata", method="DELETE")
        assert code == 200
        code, body = _http_req(f"{base}/api/status")
        assert json.loads(body)["tiene_automata"] is False
    finally:
        srv.shutdown()
        srv.server_close()


if __name__ == "__main__":
    test_tabla_1_y_recorridos()
    test_tabla_2()
    test_validaciones_y_json()
    test_graphviz_dot()
    test_servidor_web_http()
    print("Todas las pruebas (Tablas 1 y 2, validaciones, JSON, Graphviz y HTTP) pasaron.")
