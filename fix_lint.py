with open('src/utils/exportUtils.ts', 'r') as f:
    content = f.read()

content = content.replace("catch (_e) {", "catch {")

with open('src/utils/exportUtils.ts', 'w') as f:
    f.write(content)
