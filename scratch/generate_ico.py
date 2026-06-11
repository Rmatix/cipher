import subprocess
import sys
import os

def main():
    print("Installing Pillow...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    
    from PIL import Image
    png_path = r"renderer/public/logo.png"
    ico_path = r"renderer/public/logo.ico"
    
    if not os.path.exists(png_path):
        print(f"Error: {png_path} does not exist!")
        return
        
    print(f"Loading {png_path}...")
    img = Image.open(png_path)
    
    # In Pillow, to save multi-resolution ICO, we resize the image into all sizes.
    # The largest one (256x256) will be the base image to satisfy electron-builder's requirement.
    # The other sizes are passed to append_images.
    sizes = [16, 32, 48, 64, 128, 256]
    resized_images = {}
    for size in sizes:
        resized_images[size] = img.resize((size, size), Image.Resampling.LANCZOS)
    
    # Save the 256x256 image and append the others.
    base_image = resized_images[256]
    other_images = [resized_images[s] for s in [16, 32, 48, 64, 128]]
    
    print(f"Saving multi-resolution ICO to {ico_path}...")
    base_image.save(ico_path, format="ICO", append_images=other_images)
    print("Successfully generated high-resolution ICO containing 256x256 layer!")

if __name__ == "__main__":
    main()
