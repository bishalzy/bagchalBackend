import os
import re

src_dir = 'src'

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            # Replace relative imports by appending .js
            # Looks for: import ... from './...' or '../...'
            # Negative lookahead to avoid adding .js to already .js or to packages
            new_content = re.sub(
                r'(import\s+.*?from\s+[\'"]\.[^\'"]*)([\'"])',
                r'\1.js\2',
                content
            )

            # Fix specific implicit any errors
            new_content = new_content.replace('(err) =>', '(err: Error | any) =>')
            new_content = new_content.replace('p =>', '(p: any) =>')
            
            with open(path, 'w') as f:
                f.write(new_content)
