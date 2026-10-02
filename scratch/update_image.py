from PIL import Image, ImageDraw, ImageFont
import sys

img_path = "/Users/macbook/Documents/Etsy/StudioDesk/3-ETSY-LISTING/images/01-hero.jpeg"
out_path = "/Users/macbook/Documents/Etsy/StudioDesk/3-ETSY-LISTING/images/01-hero_updated.jpeg"

img = Image.open(img_path)
draw = ImageDraw.Draw(img)

# Use original image and get the background color
bg_color = img.getpixel((100, 100))

# Draw rectangle big enough to cover ALL old text, laptop starts at ~600
draw.rectangle([(0, 0), (2400, 520)], fill=bg_color)

# Try to load some system fonts
try:
    font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
    # EVEN SMALLER size for Business Dashboard
    font_large_serif = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia Bold.ttf", 135)
    font_large_serif_italic = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia Bold Italic.ttf", 135)
    font_medium = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 60)
except Exception as e:
    print("Could not load fonts", e)
    font_small = ImageFont.load_default()
    font_large_serif = ImageFont.load_default()
    font_large_serif_italic = ImageFont.load_default()
    font_medium = ImageFont.load_default()

# Colors
text_color = (25, 25, 25) # Dark grey/black
blue_color = (43, 104, 182) # Blue from 'Dashboard'

# Row 1: THE FREELANCER OS
w1 = draw.textlength("THE FREELANCER OS", font=font_small)
draw.text(((2400-w1)/2, 110), "THE FREELANCER OS", font=font_small, fill=text_color)

# Row 2: Business Dashboard
# Make it more condensed by controlling the space manually
w2_a = draw.textlength("Business", font=font_large_serif)
w2_b = draw.textlength("Dashboard", font=font_large_serif_italic)
space_between = 25 # Small space to make it look condensed
total_w2 = w2_a + space_between + w2_b

start_x = (2400 - total_w2) / 2
draw.text((start_x, 195), "Business", font=font_large_serif, fill=text_color)
draw.text((start_x + w2_a + space_between, 195), "Dashboard", font=font_large_serif_italic, fill=blue_color)

# Row 3: CRM · Invoices · Projects · Time
text3 = "CRM • Invoices • Projects • Time"
w3 = draw.textlength(text3, font=font_medium)
draw.text(((2400-w3)/2, 400), text3, font=font_medium, fill=text_color)

img.save(out_path)
print("Saved to", out_path)
