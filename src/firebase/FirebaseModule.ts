import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './FirebaseService';

@Global() // This makes the module global
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService], // Export the service so it can be used globally
})
export class FirebaseModule {}