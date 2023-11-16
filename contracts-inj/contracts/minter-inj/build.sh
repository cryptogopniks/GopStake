# script for building contract

DIR_NAME=$(echo ${PWD##*/})
DIR_NAME_SNAKE=$(echo $DIR_NAME | tr '-' '_')
WASM="$DIR_NAME_SNAKE.wasm"
CODEGEN_PATH="../../scripts/src/common/codegen"

# build optimized binary
cd ../..
cargo cw-optimizoor

# rename wasm files
cd artifacts
for file in *-*\.wasm; do
    prefix=${file%-*}
    mv "$file" "$prefix.wasm"
done

cp $WASM ../../contracts/artifacts
