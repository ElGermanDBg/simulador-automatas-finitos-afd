# 🔄 Guía para Mantener el Código Actualizado en GitHub (`ElGermanDBg` y `Dario099`)

Esta guía explica paso a paso cómo trabajar en equipo sobre el repositorio **`simulador-automatas-finitos-afd`** para que ambos integrantes tengan siempre la última versión del código sin conflictos.

**Enlace del repositorio:**  
`https://github.com/ElGermanDBg/simulador-automatas-finitos-afd`

---

## 1. Primera vez (Para el colaborador `Dario099` o en otro computador)

1. Acepta la invitación de colaborador que llegó a tu cuenta de GitHub (`Dario099`) o entra directamente a:  
   `https://github.com/ElGermanDBg/simulador-automatas-finitos-afd/invitations`
2. Abre una terminal (PowerShell o Git Bash) en la carpeta donde quieras guardar el proyecto y clónalo:
   ```bash
   git clone https://github.com/ElGermanDBg/simulador-automatas-finitos-afd.git
   cd simulador-automatas-finitos-afd
   ```

---

## 2. Regla de Oro: El Ciclo de 3 Pasos para Mantener el Código Siempre Actualizado

Cada vez que cualquiera de los dos vaya a trabajar en el proyecto, debe seguir este orden:

### Paso A: Descargar los últimos cambios ANTES de empezar a editar (`git pull`)
Antes de modificar cualquier archivo, ejecuta siempre:
```bash
git pull origin main
```
> **¿Por qué?** Esto descarga al instante cualquier cambio que tu compañero haya subido a GitHub. Así nunca trabajarás sobre una versión vieja.

---

### Paso B: Revisar qué archivos modificaste (`git status`)
Después de hacer tus mejoras o pruebas en el código, puedes ver qué archivos cambiaron con:
```bash
git status
```

---

### Paso C: Guardar y subir tus cambios a GitHub (`add` + `commit` + `push`)
Para que tu compañero reciba tus cambios de inmediato, ejecuta estos 3 comandos seguidos:

```bash
# 1. Preparar todos los archivos modificados
git add .

# 2. Guardar una instantánea con un mensaje claro de lo que hiciste
git commit -m "Descripción breve del cambio realizado"

# 3. Subir los cambios a GitHub
git push origin main
```

---

## 3. Comando Rápido "Todo en Uno" para Actualizar y Subir

Si estás en **PowerShell** (Windows) y quieres descargar cambios nuevos y subir los tuyos rápidamente:

```powershell
git pull origin main; git add .; git commit -m "Actualización del simulador AFD"; git push origin main
```

---

## 4. ¿Qué hacer si aparece un conflicto o dice que tienes cambios locales sin guardar?

- **Caso 1: Quieres descargar lo último de GitHub pero tienes cambios locales a medias:**
  ```bash
  git stash
  git pull origin main
  git stash pop
  ```
  *(Esto guarda tus cambios temporalmente, descarga lo de tu compañero y vuelve a aplicar tus cambios encima).*

- **Caso 2: Quieres descartar lo que tocaste localmente y dejar todo idéntico a como está en GitHub:**
  ```bash
  git fetch origin
  git reset --hard origin/main
  ```

---

## 5. Resumen Rápido de Comandos Útiles

| Acción | Comando |
| :--- | :--- |
| **Traer cambios nuevos del compañero** | `git pull origin main` |
| **Ver qué archivos han cambiado** | `git status` |
| **Ver el historial de cambios del equipo** | `git log --oneline -n 10` |
| **Subir mis cambios a GitHub** | `git add .` $\to$ `git commit -m "mensaje"` $\to$ `git push origin main` |
| **Ejecutar el simulador** | `python src/simulador_afd.py` |

