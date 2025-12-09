#!/usr/bin/env python3
"""
Resize and crop images to 300x420 (movie poster ratio)
"""
import os
import sys
from PIL import Image

source_folder = r"C:\Users\User\Downloads\New folder (2)"
dest_folder = r".\assets"
target_w, target_h = 300, 420

if not os.path.exists(source_folder):
    print(f"ERROR: Source folder not found: {source_folder}")
    sys.exit(1)

# Get all image files
image_exts = ('.jpg', '.jpeg', '.png', '.webp')
images = [f for f in os.listdir(source_folder) 
          if os.path.isfile(os.path.join(source_folder, f)) 
          and f.lower().endswith(image_exts)]

images.sort()
print(f"Found {len(images)} images to process\n")

processed = 0
for idx, img_name in enumerate(images[:20], 1):  # Limit to 20
    input_path = os.path.join(source_folder, img_name)
    output_name = f"grid-movie-{idx}.jpg"
    output_path = os.path.join(dest_folder, output_name)
    
    try:
        print(f"[{idx}/20] Processing: {img_name}...", end=" ")
        
        # Open and resize
        img = Image.open(input_path)
        
        # Calculate scale to fill 300x420 with proper crop
        img_ratio = img.width / img.height
        target_ratio = target_w / target_h
        
        if img_ratio > target_ratio:
            # Image is wider, crop width
            new_width = int(img.height * target_ratio)
            left = (img.width - new_width) // 2
            img = img.crop((left, 0, left + new_width, img.height))
        else:
            # Image is taller, crop height
            new_height = int(img.width / target_ratio)
            top = (img.height - new_height) // 2
            img = img.crop((0, top, img.width, top + new_height))
        
        # Resize to exact dimensions
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Save as high-quality JPEG
        img.save(output_path, quality=85, optimize=True)
        
        file_size = os.path.getsize(output_path) / 1024
        print(f"OK ({file_size:.1f} KB)")
        processed += 1
        
    except Exception as e:
        print(f"FAILED: {e}")

print("\n" + "="*50)
print(f"Processing Complete!")
print(f"Processed: {processed} images")
print(f"Saved to: {dest_folder}")
print("="*50)
