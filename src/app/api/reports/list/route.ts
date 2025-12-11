import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const zoneId = searchParams.get('zoneId');

    const where: {
      zoneId?: number;
    } = {};

    if (zoneId) {
      where.zoneId = parseInt(zoneId);
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          fights: {
            orderBy: { startTime: 'asc' },
          },
        },
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.report.count({ where }),
    ]);

    // Convertir les BigInt en Number pour la sérialisation JSON
    const reportsFormatted = reports.map(report => ({
      ...report,
      startTime: Number(report.startTime),
      endTime: Number(report.endTime),
      fightsCount: report.fights.length, // Ajouter le count pour l'affichage
      fights: report.fights.map(fight => ({
        ...fight,
        startTime: Number(fight.startTime),
        endTime: Number(fight.endTime),
      })),
    }));

    return NextResponse.json({
      reports: reportsFormatted,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching reports from database:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

