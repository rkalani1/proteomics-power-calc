with open('src/utils/exportUtils.tsx', 'r') as f:
    content = f.read()

content = content.replace("catch (_e) {", "catch {")

with open('src/utils/exportUtils.tsx', 'w') as f:
    f.write(content)
