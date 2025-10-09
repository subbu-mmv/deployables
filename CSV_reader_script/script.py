import pandas as pd
import io

def process_csv(csv_text):
    # Create DataFrame
    df = pd.read_csv(io.StringIO(csv_text))
    # Example manipulation (optional)
    print("Shape:", df.shape)
    return df
