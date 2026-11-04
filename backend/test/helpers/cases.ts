import { PrismaService } from '../../src/prisma/prisma.service';
import { dataForStatus } from '../../src/reviews/review-states';

/**
 * Las reseñas de 1 y 2 estrellas pasan por un caso de evidencias antes de
 * publicarse. Para probar lo que ocurre después, se simula que el caso se cerró
 * sin acuerdo y la reseña quedó publicada (el flujo real está en cases.e2e-spec).
 */
export async function publishAfterCase(prisma: PrismaService, reviewId: string): Promise<void> {
  const review = await prisma.review.findUniqueOrThrow({ where: { id: reviewId } });
  await prisma.review.updateMany({
    where: { id: reviewId },
    data: dataForStatus('published', review),
  });
  await prisma.reviewCase.updateMany({
    where: { reviewId },
    data: { status: 'closed', outcome: 'published', closedAt: new Date() },
  });
}
