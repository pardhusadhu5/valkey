const { pipeline } = require('@xenova/transformers');

async function test() {
    console.log("Loading pipeline...");
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log("Pipeline loaded successfully.");
    
    console.log("Generating embedding...");
    const output = await embedder("Hello world", { pooling: 'mean', normalize: true });
    console.log("Embedding generated successfully! Vector length:", output.data.length);
    console.log("First 5 values:", Array.from(output.data).slice(0, 5));
    process.exit(0);
}

test().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
