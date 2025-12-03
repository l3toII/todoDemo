<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Context;
use App\Repository\ContextRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:seed:contexts',
    description: 'Seed default GTD contexts (@Office, @Home, @Phone, etc.)'
)]
class SeedContextsCommand extends Command
{
    private const DEFAULT_CONTEXTS = [
        ['name' => '@Office', 'icon' => 'briefcase', 'color' => '#3498db'],
        ['name' => '@Home', 'icon' => 'home', 'color' => '#27ae60'],
        ['name' => '@Phone', 'icon' => 'phone', 'color' => '#9b59b6'],
        ['name' => '@Errands', 'icon' => 'shopping-cart', 'color' => '#e74c3c'],
        ['name' => '@Computer', 'icon' => 'laptop', 'color' => '#f39c12'],
        ['name' => '@Waiting', 'icon' => 'clock', 'color' => '#95a5a6'],
    ];

    public function __construct(
        private readonly ContextRepository $contextRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('force', 'f', InputOption::VALUE_NONE, 'Force re-creation of existing default contexts');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $force = $input->getOption('force');

        $io->title('Seeding Default GTD Contexts');

        $existingDefaults = $this->contextRepository->findDefaults();
        $existingNames = array_map(static fn(Context $c) => $c->getName(), $existingDefaults);

        $created = 0;
        $skipped = 0;

        foreach (self::DEFAULT_CONTEXTS as $position => $contextData) {
            $name = $contextData['name'];

            if (in_array($name, $existingNames, true) && !$force) {
                $io->text(sprintf('  [SKIP] %s already exists', $name));
                $skipped++;
                continue;
            }

            // Remove existing if force mode
            if ($force) {
                $existing = $this->findExistingDefault($existingDefaults, $name);
                if ($existing !== null) {
                    $this->contextRepository->remove($existing, false);
                    $io->text(sprintf('  [REMOVE] Removed existing %s', $name));
                }
            }

            $context = Context::createDefault(
                $contextData['name'],
                $contextData['icon'],
                $contextData['color']
            );
            $context->setPosition($position);

            $this->contextRepository->save($context, false);
            $io->text(sprintf('  [CREATE] %s', $name));
            $created++;
        }

        // Flush all changes at once
        $this->contextRepository->save($context ?? $existingDefaults[0], true);

        $io->newLine();
        $io->success(sprintf(
            'Seed complete: %d created, %d skipped',
            $created,
            $skipped
        ));

        return Command::SUCCESS;
    }

    /**
     * @param Context[] $contexts
     */
    private function findExistingDefault(array $contexts, string $name): ?Context
    {
        foreach ($contexts as $context) {
            if ($context->getName() === $name) {
                return $context;
            }
        }

        return null;
    }
}
