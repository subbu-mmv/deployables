import io, sys, pandas as pd

df = pd.read_csv(csv_filename, sep="\t")
print("DataFrame shape:", df.shape)
print(df.head().to_string())
