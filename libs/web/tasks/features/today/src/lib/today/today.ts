import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AuthSession } from '@daylo/web/core/auth/data-access';

@Component({
  selector: 'lib-today',
  imports: [MatCardModule],
  templateUrl: './today.html',
  styleUrl: './today.scss',
})
export class Today {
  private readonly auth = inject(AuthSession);
  protected readonly user = this.auth.user;
}
