import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');

  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    
    let filePath: string;
    if (type === 'comparison') {
      filePath = path.join(dataDir, 'paper_comparison.json');
    } else if (type === 'trades') {
      filePath = path.join(dataDir, 'paper_trades.json');
    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Data file not found' }, { status: 404 });
    }

    // Read and parse JSON
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error reading paper trading data:', error);
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    );
  }
}
