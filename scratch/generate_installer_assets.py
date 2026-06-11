import os
import sys
import subprocess

def main():
    print("Installing Pillow...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    
    from PIL import Image, ImageDraw
    
    logo_path = "renderer/public/logo.png"
    ico_path = "renderer/public/logo.ico"
    sidebar_path = "build/installerSidebar.png"
    
    if not os.path.exists(logo_path):
        print(f"Error: No se encontro el logotipo en {logo_path}")
        return
        
    print(f"Abriendo logotipo original: {logo_path}...")
    orig_img = Image.open(logo_path)
    
    # 1. Normalizar imagen a 1:1 cuadrada sin deformar (usar padding transparente)
    w, h = orig_img.size
    new_dim = max(w, h)
    print(f"Dimensiones originales: {w}x{h}. Creando lienzo cuadrado de {new_dim}x{new_dim}...")
    
    square_img = Image.new("RGBA", (new_dim, new_dim), (0, 0, 0, 0))
    offset = ((new_dim - w) // 2, (new_dim - h) // 2)
    square_img.paste(orig_img, offset)
    
    # Sobrescribir el logotipo con la version cuadrada
    print(f"Sobrescribiendo logotipo cuadrado en {logo_path}...")
    square_img.save(logo_path, format="PNG")
    
    # 2. Re-generar logo.ico con multiples capas 1:1
    sizes = [16, 32, 48, 64, 128, 256]
    resized_images = {}
    for size in sizes:
        resized_images[size] = square_img.resize((size, size), Image.Resampling.LANCZOS)
        
    base_image = resized_images[256]
    other_images = [resized_images[s] for s in [16, 32, 48, 64, 128]]
    
    print(f"Guardando icono multi-resolucion en {ico_path}...")
    base_image.save(ico_path, format="ICO", append_images=other_images)
    
    # 3. Generar la barra lateral del instalador (164x314 píxeles) con degradado y logo
    print(f"Generando imagen lateral de NSIS en {sidebar_path} (164x314)...")
    os.makedirs(os.path.dirname(sidebar_path), exist_ok=True)
    
    sidebar = Image.new("RGBA", (164, 314))
    
    # Dibujar degradado vertical de fondo: #0c1018 (arriba) a #201235 (abajo)
    # Colores:
    # Arriba: R=12, G=16, B=24
    # Abajo: R=32, G=18, B=53
    for y in range(314):
        r = int(12 + (32 - 12) * (y / 314))
        g = int(16 + (18 - 16) * (y / 314))
        b = int(24 + (53 - 24) * (y / 314))
        for x in range(164):
            sidebar.putpixel((x, y), (r, g, b, 255))
            
    # Redimensionar el logo cuadrado para que encaje de manera elegante en el centro de la barra lateral (por ejemplo, 96x96 px)
    logo_size = 96
    logo_sidebar = square_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    # Calcular posicion de centrado
    logo_x = (164 - logo_size) // 2
    logo_y = (314 - logo_size) // 2 - 25 # Un poco hacia arriba del centro vertical
    
    sidebar.paste(logo_sidebar, (logo_x, logo_y), logo_sidebar)
    
    # Opcional: Dibujar un borde o detalles para darle profundidad
    draw = ImageDraw.Draw(sidebar)
    # Linea de division sutil a la derecha
    draw.line([(163, 0), (163, 313)], fill=(255, 255, 255, 12))
    
    # Guardar en build/installerSidebar.png
    sidebar.save(sidebar_path, format="PNG")
    print("Recursos graficos generados con exito!")

if __name__ == "__main__":
    main()
