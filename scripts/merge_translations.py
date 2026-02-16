import json
import os
import sys

def merge_translations():
    target_file = 'i18n/zh-cn.json'
    source_file = 'temp_translations.json'

    if not os.path.exists(target_file):
        print(f"Error: {target_file} not found.")
        return
    if not os.path.exists(source_file):
        print(f"Error: {source_file} not found.")
        return

    try:
        with open(target_file, 'r', encoding='utf-8') as f:
            target_data = json.load(f)
        
        with open(source_file, 'r', encoding='utf-8') as f:
            source_data = json.load(f)
        
        updated_count = 0
        for key, value in source_data.items():
            if key in target_data:
                # Only update if the target value is empty or we want to overwrite
                # Here we assume source_data contains the new translations for empty slots
                if target_data[key] == "" and value != "":
                    target_data[key] = value
                    updated_count += 1
                elif target_data[key] != "" and value != "":
                     # Optional: Overwrite existing if needed, but for now let's prioritize filling empty
                     pass
            else:
                # If key doesn't exist, add it (though we expect keys to exist)
                target_data[key] = value
                updated_count += 1
        
        # Remove garbage key if present
        if "file_path" in target_data:
            del target_data["file_path"]

        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(target_data, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully updated {updated_count} entries.")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    merge_translations()
