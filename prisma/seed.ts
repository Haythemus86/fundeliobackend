import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  ['Anniversaire', 'Festivité'],
  ['Pot de départ / Retraite', 'Festivité'],
  ['Naissance', 'Festivité'],
  ['Mariage', 'Festivité'],
  ['Remerciements', 'Festivité'],
  ['Évènements', 'Festivité'],
  ['Autre dépense à plusieurs', 'Festivité'],
  ['Entraide', 'Solidarité'],
  ['Animaux', 'Solidarité'],
  ['Obsèques', 'Solidarité'],
  ['Santé', 'Solidarité'],
  ['Environnement', 'Solidarité'],
  ['Autre projet solidaire', 'Solidarité'],
  ['Séminaire', 'Entreprise'],
  ['Afterwork / Pot', 'Entreprise'],
  ['Autre évènement', 'Entreprise'],
  ['Cause sociale', 'Association & ONG'],
  ['Humanitaire', 'Association & ONG'],
  ['Autre projet ONG', 'Association & ONG'],
] as const;

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function main() {
  for (const [name, groupName] of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { groupName, slug: slugify(name) },
      create: { name, groupName, slug: slugify(name) },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());