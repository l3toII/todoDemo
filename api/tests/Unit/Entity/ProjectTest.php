<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Project;
use App\Entity\User;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

class ProjectTest extends TestCase
{
    private function createUser(): User
    {
        $user = new User();
        $user->setEmail('test@example.com');
        return $user;
    }

    public function testProjectCreation(): void
    {
        $project = new Project();

        $this->assertInstanceOf(Uuid::class, $project->getId());
        $this->assertInstanceOf(\DateTimeImmutable::class, $project->getCreatedAt());
        $this->assertInstanceOf(\DateTimeImmutable::class, $project->getUpdatedAt());
    }

    public function testNameGetterSetter(): void
    {
        $project = new Project();
        $name = 'My Project';

        $project->setName($name);

        $this->assertEquals($name, $project->getName());
    }

    public function testUserGetterSetter(): void
    {
        $project = new Project();
        $user = $this->createUser();

        $project->setUser($user);

        $this->assertSame($user, $project->getUser());
    }

    public function testOnPreUpdate(): void
    {
        $project = new Project();
        $originalUpdatedAt = $project->getUpdatedAt();

        usleep(1000);

        $project->onPreUpdate();

        $this->assertNotEquals($originalUpdatedAt, $project->getUpdatedAt());
        $this->assertGreaterThan($originalUpdatedAt, $project->getUpdatedAt());
    }

    public function testFluentInterface(): void
    {
        $project = new Project();
        $user = $this->createUser();

        $result = $project
            ->setName('Test Project')
            ->setUser($user);

        $this->assertSame($project, $result);
    }
}
