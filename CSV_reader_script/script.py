import io, sys, pandas as pd

def read_csv(csv_filename, sep="\t"):
    df = pd.read_csv(csv_filename, sep=sep)
    print("DataFrame shape:", df.shape)
    print(df.head().to_string())
    return df

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <csv_filename> [sep]")
        sys.exit(1)
    
    csv_filename = sys.argv[1]
    sep = sys.argv[2] if len(sys.argv) > 2 else "\t"
    
    read_csv(csv_filename, sep)
    