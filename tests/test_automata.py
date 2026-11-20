"""
Pruebas de los autómatas A1-A4 y de las Tablas 1 y 2 del enunciado.
Ejecutar desde la raíz del proyecto:  python tests/test_automata.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src"))
from simulador_afd import Automata  # noqa: E402

A1 = Automata(['q0', 'q1'], ['0', '1'],
              {('q0', '0'): 'q1', ('q0', '1'): 'q0', ('q1', '0'): 'q0', ('q1', '1'): 'q1'},
              'q0', ['q0'])
A2 = Automata(['s0', 's1', 's2'], ['a', 'b'],
              {('s0', 'a'): 's1', ('s0', 'b'): 's0', ('s1', 'a'): 's1',
               ('s1', 'b'): 's2', ('s2', 'a'): 's1', ('s2', 'b'): 's0'},
              's0', ['s2'])
A3 = Automata(['p0', 'p1', 'p2', 'p3', 'm'], ['a', 'b'],
              {('p0', 'a'): 'p1', ('p0', 'b'): 'p2', ('p1', 'a'): 'm', ('p1', 'b'): 'p3',
               ('p2', 'a'): 'p3', ('p2', 'b'): 'm', ('p3', 'a'): 'm', ('p3', 'b'): 'm',
               ('m', 'a'): 'm', ('m', 'b'): 'm'},
              'p0', ['p3'])
A4 = Automata(['q0', 'q1'], ['a'], {('q0', 'a'): 'q0', ('q1', 'a'): 'q1'}, 'q0', ['q1'])


def palabras(afd):
    return [p['palabra_repr'] for p in afd.generar_palabras_reconocidas(5, 10)]


def test_tabla_1():
    assert palabras(A1) == ['ε', '1', '00', '11', '001']
    assert palabras(A2) == ['ab', 'aab', 'bab', 'aaab', 'abab']
    assert palabras(A3) == ['ab', 'ba']
    assert palabras(A4) == []


def test_tabla_2():
    casos = [(A2, 'abab', True), (A2, 'aba', False), (A2, 'bab', True), (A2, 'bb', False),
             (A2, '', False), (A1, '0110', True), (A1, '1011', False), (A1, '', True)]
    for afd, palabra, esperado in casos:
        assert afd.evaluar_cadena(palabra)['aceptada'] is esperado, (palabra, esperado)
    r = A2.evaluar_cadena('abc')
    assert (r['aceptada'], r['error_simbolo'], r['error_posicion']) == (False, 'c', 3)
    assert A1.evaluar_cadena('0110')['recorrido_str'] == 'q0 -0→ q1 -1→ q1 -1→ q1 -0→ q0'


if __name__ == "__main__":
    test_tabla_1()
    test_tabla_2()
    print("Todas las pruebas de las Tablas 1 y 2 pasaron.")
