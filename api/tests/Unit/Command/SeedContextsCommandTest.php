<?php

declare(strict_types=1);

namespace App\Tests\Unit\Command;

use App\Command\SeedContextsCommand;
use App\Entity\Context;
use App\Repository\ContextRepository;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Application;
use Symfony\Component\Console\Tester\CommandTester;

class SeedContextsCommandTest extends TestCase
{
    private MockObject&ContextRepository $contextRepository;
    private SeedContextsCommand $command;
    private CommandTester $commandTester;

    protected function setUp(): void
    {
        $this->contextRepository = $this->createMock(ContextRepository::class);
        $this->command = new SeedContextsCommand($this->contextRepository);

        $application = new Application();
        $application->add($this->command);

        $this->commandTester = new CommandTester($this->command);
    }

    public function testCommandName(): void
    {
        $this->assertEquals('app:seed:contexts', $this->command->getName());
    }

    public function testCommandDescription(): void
    {
        $this->assertEquals(
            'Seed default GTD contexts (@Office, @Home, @Phone, etc.)',
            $this->command->getDescription()
        );
    }

    public function testSeedCreatesAllDefaultContextsWhenNoneExist(): void
    {
        $this->contextRepository
            ->expects($this->once())
            ->method('findDefaults')
            ->willReturn([]);

        // 6 contexts saved without flush + 1 final flush = 7 calls
        $this->contextRepository
            ->expects($this->exactly(7))
            ->method('save');

        $exitCode = $this->commandTester->execute([]);

        $this->assertEquals(0, $exitCode);

        $output = $this->commandTester->getDisplay();
        $this->assertStringContainsString('[CREATE] @Office', $output);
        $this->assertStringContainsString('[CREATE] @Home', $output);
        $this->assertStringContainsString('[CREATE] @Phone', $output);
        $this->assertStringContainsString('[CREATE] @Errands', $output);
        $this->assertStringContainsString('[CREATE] @Computer', $output);
        $this->assertStringContainsString('[CREATE] @Waiting', $output);
        $this->assertStringContainsString('6 created, 0 skipped', $output);
    }

    public function testSeedSkipsExistingContexts(): void
    {
        $existingContext = $this->createMockContext('@Office');

        $this->contextRepository
            ->expects($this->once())
            ->method('findDefaults')
            ->willReturn([$existingContext]);

        // 5 new contexts + 1 final flush
        $this->contextRepository
            ->expects($this->exactly(6))
            ->method('save');

        $exitCode = $this->commandTester->execute([]);

        $this->assertEquals(0, $exitCode);

        $output = $this->commandTester->getDisplay();
        $this->assertStringContainsString('[SKIP] @Office already exists', $output);
        $this->assertStringContainsString('5 created, 1 skipped', $output);
    }

    public function testSeedSkipsAllWhenAllExist(): void
    {
        $existingContexts = [
            $this->createMockContext('@Office'),
            $this->createMockContext('@Home'),
            $this->createMockContext('@Phone'),
            $this->createMockContext('@Errands'),
            $this->createMockContext('@Computer'),
            $this->createMockContext('@Waiting'),
        ];

        $this->contextRepository
            ->expects($this->once())
            ->method('findDefaults')
            ->willReturn($existingContexts);

        // Only the final flush save
        $this->contextRepository
            ->expects($this->once())
            ->method('save');

        $exitCode = $this->commandTester->execute([]);

        $this->assertEquals(0, $exitCode);

        $output = $this->commandTester->getDisplay();
        $this->assertStringContainsString('0 created, 6 skipped', $output);
    }

    public function testForceOptionReplacesExistingContexts(): void
    {
        $existingContext = $this->createMockContext('@Office');

        $this->contextRepository
            ->expects($this->once())
            ->method('findDefaults')
            ->willReturn([$existingContext]);

        $this->contextRepository
            ->expects($this->once())
            ->method('remove')
            ->with($existingContext, false);

        // 6 creates + 1 flush
        $this->contextRepository
            ->expects($this->exactly(7))
            ->method('save');

        $exitCode = $this->commandTester->execute(['--force' => true]);

        $this->assertEquals(0, $exitCode);

        $output = $this->commandTester->getDisplay();
        $this->assertStringContainsString('[REMOVE] Removed existing @Office', $output);
        $this->assertStringContainsString('[CREATE] @Office', $output);
        $this->assertStringContainsString('6 created, 0 skipped', $output);
    }

    public function testForceOptionWithMultipleExisting(): void
    {
        $existingContexts = [
            $this->createMockContext('@Office'),
            $this->createMockContext('@Home'),
        ];

        $this->contextRepository
            ->expects($this->once())
            ->method('findDefaults')
            ->willReturn($existingContexts);

        $this->contextRepository
            ->expects($this->exactly(2))
            ->method('remove');

        // 6 creates + 1 flush
        $this->contextRepository
            ->expects($this->exactly(7))
            ->method('save');

        $exitCode = $this->commandTester->execute(['--force' => true]);

        $this->assertEquals(0, $exitCode);

        $output = $this->commandTester->getDisplay();
        $this->assertStringContainsString('[REMOVE] Removed existing @Office', $output);
        $this->assertStringContainsString('[REMOVE] Removed existing @Home', $output);
        $this->assertStringContainsString('6 created, 0 skipped', $output);
    }

    public function testForceOptionWithNonExisting(): void
    {
        $this->contextRepository
            ->expects($this->once())
            ->method('findDefaults')
            ->willReturn([]);

        // Never called because nothing exists
        $this->contextRepository
            ->expects($this->never())
            ->method('remove');

        $exitCode = $this->commandTester->execute(['--force' => true]);

        $this->assertEquals(0, $exitCode);

        $output = $this->commandTester->getDisplay();
        $this->assertStringContainsString('6 created, 0 skipped', $output);
    }

    public function testOutputContainsTitle(): void
    {
        $this->contextRepository
            ->method('findDefaults')
            ->willReturn([]);

        $this->commandTester->execute([]);

        $output = $this->commandTester->getDisplay();
        $this->assertStringContainsString('Seeding Default GTD Contexts', $output);
    }

    public function testOutputContainsSuccessMessage(): void
    {
        $this->contextRepository
            ->method('findDefaults')
            ->willReturn([]);

        $this->commandTester->execute([]);

        $output = $this->commandTester->getDisplay();
        $this->assertStringContainsString('Seed complete:', $output);
    }

    private function createMockContext(string $name): Context
    {
        $context = $this->createMock(Context::class);
        $context->method('getName')->willReturn($name);

        return $context;
    }
}
